import 'server-only';

import {
   createHash,
   createPrivateKey,
   createSign,
   randomBytes,
   timingSafeEqual,
} from 'node:crypto';

const GITHUB_API_ORIGIN = 'https://api.github.com';
const GITHUB_WEB_ORIGIN = 'https://github.com';
const GITHUB_API_VERSION = '2026-03-10';
const AUTHORIZATION_TTL_MS = 15 * 60 * 1000;

export const GITHUB_STATE_COOKIE = 'adisearch_github_state';
export const GITHUB_PKCE_COOKIE = 'adisearch_github_pkce';
export const GITHUB_INTEGRATION_COOKIE_PATH = '/api/integrations/github';

export type GithubAppReadiness = {
   available: boolean;
   reason: string | null;
};

type GithubAppConfiguration = {
   appId: string;
   appSlug: string;
   clientId: string;
   clientSecret: string;
   privateKey: string;
   siteOrigin: string;
};

type GithubInstallation = {
   id: number;
   account?: {
      login?: string | null;
      slug?: string | null;
      name?: string | null;
   } | null;
   permissions?: Record<string, string | null> | null;
};

function normalizedPrivateKey(value: string) {
   return value.includes('\\n') ? value.replaceAll('\\n', '\n') : value;
}

function readConfiguration(): GithubAppConfiguration | null {
   const appId = process.env.GITHUB_APP_ID?.trim();
   const appSlug = process.env.GITHUB_APP_SLUG?.trim();
   const clientId = process.env.GITHUB_APP_CLIENT_ID?.trim();
   const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET?.trim();
   const rawPrivateKey = process.env.GITHUB_APP_PRIVATE_KEY?.trim();
   const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

   if (!appId || !appSlug || !clientId || !clientSecret || !rawPrivateKey || !siteUrl) {
      return null;
   }
   if (!/^[1-9][0-9]*$/.test(appId)) return null;
   if (!/^[a-zA-Z0-9-]+$/.test(appSlug)) return null;

   let siteOrigin: string;
   try {
      const url = new URL(siteUrl);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
      siteOrigin = url.origin;
   } catch {
      return null;
   }

   const privateKey = normalizedPrivateKey(rawPrivateKey);
   if (!privateKey.includes('BEGIN') || !privateKey.includes('PRIVATE KEY')) return null;

   return { appId, appSlug, clientId, clientSecret, privateKey, siteOrigin };
}

function requireConfiguration() {
   const configuration = readConfiguration();
   if (!configuration) throw new Error('GITHUB_APP_NOT_CONFIGURED');
   return configuration;
}

export function githubAppReadiness(): GithubAppReadiness {
   return readConfiguration()
      ? { available: true, reason: null }
      : {
           available: false,
           reason: 'GitHub App setup is not configured for this deployment.',
        };
}

export function githubAuthorizationExpiry(now = Date.now()) {
   return new Date(now + AUTHORIZATION_TTL_MS).toISOString();
}

export function generateGithubOAuthState() {
   return randomBytes(32).toString('base64url');
}

export function hashGithubOAuthState(state: string) {
   return createHash('sha256').update(state, 'utf8').digest('hex');
}

export function generateGithubPkceVerifier() {
   return randomBytes(48).toString('base64url');
}

export function githubPkceChallenge(verifier: string) {
   return createHash('sha256').update(verifier, 'utf8').digest('base64url');
}

export function opaqueTokensMatch(left: string | null | undefined, right: string | null | undefined) {
   if (!left || !right || left.length > 256 || right.length > 256) return false;
   const leftBytes = Buffer.from(left, 'utf8');
   const rightBytes = Buffer.from(right, 'utf8');
   return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export function githubIntegrationCookieOptions() {
   const configuration = requireConfiguration();
   return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: configuration.siteOrigin.startsWith('https://'),
      path: GITHUB_INTEGRATION_COOKIE_PATH,
      maxAge: Math.floor(AUTHORIZATION_TTL_MS / 1000),
   };
}

export function githubInstallUrl(state: string) {
   const { appSlug } = requireConfiguration();
   const url = new URL(`/apps/${encodeURIComponent(appSlug)}/installations/new`, GITHUB_WEB_ORIGIN);
   url.searchParams.set('state', state);
   return url.toString();
}

export function githubSetupUrl() {
   const { siteOrigin } = requireConfiguration();
   return new URL('/api/integrations/github/setup', siteOrigin).toString();
}

export function githubCallbackUrl() {
   const { siteOrigin } = requireConfiguration();
   return new URL('/api/integrations/github/callback', siteOrigin).toString();
}

export function githubUserAuthorizationUrl(state: string, pkceVerifier: string) {
   const { clientId } = requireConfiguration();
   const url = new URL('/login/oauth/authorize', GITHUB_WEB_ORIGIN);
   url.searchParams.set('client_id', clientId);
   url.searchParams.set('redirect_uri', githubCallbackUrl());
   url.searchParams.set('state', state);
   url.searchParams.set('code_challenge', githubPkceChallenge(pkceVerifier));
   url.searchParams.set('code_challenge_method', 'S256');
   return url.toString();
}

function githubHeaders(authorization: string) {
   return {
      Accept: 'application/vnd.github+json',
      Authorization: authorization,
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
      'User-Agent': 'Adisearch-Workspace',
   };
}

export async function exchangeGithubUserCode(code: string, pkceVerifier: string) {
   const { clientId, clientSecret } = requireConfiguration();
   const response = await fetch(new URL('/login/oauth/access_token', GITHUB_WEB_ORIGIN), {
      method: 'POST',
      cache: 'no-store',
      headers: {
         Accept: 'application/json',
         'Content-Type': 'application/json',
      },
      body: JSON.stringify({
         client_id: clientId,
         client_secret: clientSecret,
         code,
         redirect_uri: githubCallbackUrl(),
         code_verifier: pkceVerifier,
      }),
   });

   if (!response.ok) throw new Error('GITHUB_USER_AUTHORIZATION_FAILED');
   const payload = (await response.json()) as { access_token?: unknown; token_type?: unknown; error?: unknown };
   if (typeof payload.access_token !== 'string' || payload.access_token.length < 10) {
      throw new Error('GITHUB_USER_AUTHORIZATION_FAILED');
   }
   return payload.access_token;
}

export async function verifyGithubUserCanAccessInstallation(
   installationId: string,
   ephemeralUserAccessToken: string
) {
   const url = new URL(
      `/user/installations/${encodeURIComponent(installationId)}/repositories`,
      GITHUB_API_ORIGIN
   );
   url.searchParams.set('per_page', '1');
   const response = await fetch(url, {
      cache: 'no-store',
      headers: githubHeaders(`Bearer ${ephemeralUserAccessToken}`),
   });
   if (!response.ok) throw new Error('GITHUB_INSTALLATION_NOT_ACCESSIBLE_TO_USER');
}

function base64UrlJson(value: unknown) {
   return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

export function createGithubAppJwt(nowSeconds = Math.floor(Date.now() / 1000)) {
   const { appId, privateKey } = requireConfiguration();
   const header = base64UrlJson({ alg: 'RS256', typ: 'JWT' });
   const payload = base64UrlJson({
      iat: nowSeconds - 60,
      exp: nowSeconds + 9 * 60,
      iss: appId,
   });
   const signingInput = `${header}.${payload}`;
   const signer = createSign('RSA-SHA256');
   signer.update(signingInput);
   signer.end();
   const signature = signer.sign(createPrivateKey(privateKey)).toString('base64url');
   return `${signingInput}.${signature}`;
}

function normalizeInstallationScopes(permissions: GithubInstallation['permissions']) {
   if (!permissions) return [];
   return Object.entries(permissions)
      .filter(([, level]) => typeof level === 'string' && level !== 'none')
      .map(([permission, level]) => `${permission}:${level}`)
      .sort()
      .slice(0, 50);
}

export async function verifyGithubInstallationBelongsToApp(installationId: string) {
   const url = new URL(`/app/installations/${encodeURIComponent(installationId)}`, GITHUB_API_ORIGIN);
   const response = await fetch(url, {
      cache: 'no-store',
      headers: githubHeaders(`Bearer ${createGithubAppJwt()}`),
   });
   if (!response.ok) throw new Error('GITHUB_INSTALLATION_NOT_OWNED_BY_APP');

   const installation = (await response.json()) as GithubInstallation;
   if (String(installation.id) !== installationId) {
      throw new Error('GITHUB_INSTALLATION_MISMATCH');
   }

   const rawLabel =
      installation.account?.login ?? installation.account?.slug ?? installation.account?.name ?? '';
   const accountLabel = rawLabel.trim().slice(0, 255);
   if (!accountLabel) throw new Error('GITHUB_INSTALLATION_ACCOUNT_MISSING');

   return {
      installationId,
      accountLabel,
      scopes: normalizeInstallationScopes(installation.permissions),
   };
}
