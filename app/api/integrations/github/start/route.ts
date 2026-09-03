import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin } from '@/lib/api/security';
import {
   GITHUB_PKCE_COOKIE,
   GITHUB_STATE_COOKIE,
   generateGithubOAuthState,
   generateGithubPkceVerifier,
   githubAppReadiness,
   githubAuthorizationExpiry,
   githubInstallUrl,
   githubIntegrationCookieOptions,
   hashGithubOAuthState,
} from '@/lib/integrations/github/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { authorizeWorkspaceMemberAccess } from '@/lib/workspace-members/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
   if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
   }
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const context = await authorizeWorkspaceMemberAccess(
      request,
      true,
      'Unable to start the GitHub connection.'
   );
   if ('response' in context) return context.response;

   const readiness = githubAppReadiness();
   if (!readiness.available) {
      return NextResponse.json(
         { error: readiness.reason, provider: { github: readiness } },
         { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
      );
   }

   const { data: existing, error: existingError } = await context.supabase
      .from('integration_connections')
      .select('id, status')
      .eq('organization_id', context.organizationId)
      .eq('provider', 'github')
      .eq('connection_scope', 'organization')
      .maybeSingle();

   if (existingError) {
      return NextResponse.json({ error: 'Unable to inspect the GitHub connection.' }, { status: 500 });
   }
   if (existing?.status === 'connected') {
      return NextResponse.json({ error: 'GitHub is already connected to this workspace.' }, { status: 409 });
   }

   const state = generateGithubOAuthState();
   const pkceVerifier = generateGithubPkceVerifier();
   const stateHash = hashGithubOAuthState(state);
   const expiresAt = githubAuthorizationExpiry();

   const { data, error } = await context.supabase.rpc('create_integration_authorization_state', {
      p_organization_id: context.organizationId,
      p_provider: 'github',
      p_state_hash: stateHash,
      p_expires_at: expiresAt,
   });
   if (error || !data?.[0]) {
      return NextResponse.json({ error: 'Unable to initialize the GitHub connection.' }, { status: 500 });
   }

   const response = NextResponse.json(
      { authorizeUrl: githubInstallUrl(state), provider: { github: readiness } },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
   const cookieOptions = githubIntegrationCookieOptions();
   response.cookies.set(GITHUB_STATE_COOKIE, state, cookieOptions);
   response.cookies.set(GITHUB_PKCE_COOKIE, pkceVerifier, cookieOptions);
   return response;
}
