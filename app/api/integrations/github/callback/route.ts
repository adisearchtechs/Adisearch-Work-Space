import { NextResponse, type NextRequest } from 'next/server';
import {
   GITHUB_INTEGRATION_COOKIE_PATH,
   GITHUB_PKCE_COOKIE,
   GITHUB_STATE_COOKIE,
   exchangeGithubUserCode,
   githubAppReadiness,
   hashGithubOAuthState,
   opaqueTokensMatch,
   verifyGithubInstallationBelongsToApp,
   verifyGithubUserCanAccessInstallation,
} from '@/lib/integrations/github/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export const runtime = 'nodejs';

function clearFlowCookies(response: NextResponse, request: NextRequest) {
   const options = {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: request.nextUrl.protocol === 'https:',
      path: GITHUB_INTEGRATION_COOKIE_PATH,
      maxAge: 0,
   };
   response.cookies.set(GITHUB_STATE_COOKIE, '', options);
   response.cookies.set(GITHUB_PKCE_COOKIE, '', options);
   return response;
}

function callbackError(request: NextRequest, message: string, status = 400) {
   return clearFlowCookies(
      NextResponse.json(
         { error: message },
         { status, headers: { 'Cache-Control': 'private, no-store' } }
      ),
      request
   );
}

function settingsRedirect(request: NextRequest, slug: string, result: 'connected' | 'error' | 'cancelled') {
   const url = new URL(`/${encodeURIComponent(slug)}/settings/connected-accounts`, request.nextUrl.origin);
   url.searchParams.set('integration', 'github');
   url.searchParams.set('result', result);
   const response = NextResponse.redirect(url);
   response.headers.set('Cache-Control', 'private, no-store');
   return clearFlowCookies(response, request);
}

export async function GET(request: NextRequest) {
   if (!isSupabaseConfigured()) return callbackError(request, 'Database is not configured.', 503);

   const readiness = githubAppReadiness();
   if (!readiness.available) return callbackError(request, readiness.reason ?? 'GitHub App is unavailable.', 503);

   const state = request.nextUrl.searchParams.get('state');
   const code = request.nextUrl.searchParams.get('code');
   const providerError = request.nextUrl.searchParams.get('error');
   const cookieState = request.cookies.get(GITHUB_STATE_COOKIE)?.value;
   const pkceVerifier = request.cookies.get(GITHUB_PKCE_COOKIE)?.value;

   if (!opaqueTokensMatch(state, cookieState)) {
      return callbackError(request, 'Invalid or expired GitHub authorization state.');
   }
   if (!pkceVerifier || pkceVerifier.length < 43 || pkceVerifier.length > 128) {
      return callbackError(request, 'Invalid or expired GitHub authorization verifier.');
   }

   const supabase = await createClient();
   const { data: claimsData } = await supabase.auth.getClaims();
   if (!claimsData?.claims?.sub) return callbackError(request, 'Unauthorized.', 401);

   const stateHash = hashGithubOAuthState(state!);
   const { data: stateData, error: stateError } = await supabase.rpc(
      'get_integration_authorization_state',
      { p_state_hash: stateHash }
   );
   const authorization = stateData?.[0];
   if (stateError || !authorization) {
      return callbackError(request, 'This GitHub connection request is invalid or expired.');
   }

   const { data: organization, error: organizationError } = await supabase
      .from('organizations')
      .select('slug')
      .eq('id', authorization.organization_id)
      .maybeSingle();
   if (organizationError || !organization) {
      return callbackError(request, 'Unable to resolve the workspace for this GitHub connection.', 500);
   }

   if (providerError || !code) {
      return settingsRedirect(request, organization.slug, providerError === 'access_denied' ? 'cancelled' : 'error');
   }

   const installationId = authorization.candidate_external_id;
   if (!installationId) return settingsRedirect(request, organization.slug, 'error');

   try {
      // This user token exists only long enough to prove that the signed-in user can access
      // the installation selected during setup. It is never logged, returned, or persisted.
      const ephemeralUserAccessToken = await exchangeGithubUserCode(code, pkceVerifier);
      await verifyGithubUserCanAccessInstallation(installationId, ephemeralUserAccessToken);

      // Independently authenticate as the configured GitHub App to prove that the same
      // installation belongs to this app and to read authoritative account/permission metadata.
      const verifiedInstallation = await verifyGithubInstallationBelongsToApp(installationId);
      const { data: completed, error: completeError } = await supabase.rpc(
         'complete_github_integration_authorization',
         {
            p_state_hash: stateHash,
            p_installation_id: verifiedInstallation.installationId,
            p_account_label: verifiedInstallation.accountLabel,
            p_scopes: verifiedInstallation.scopes,
         }
      );
      if (completeError || !completed?.[0]) throw new Error('GITHUB_CONNECTION_NOT_COMPLETED');
   } catch {
      return settingsRedirect(request, organization.slug, 'error');
   }

   return settingsRedirect(request, organization.slug, 'connected');
}
