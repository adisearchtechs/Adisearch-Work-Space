import { NextResponse, type NextRequest } from 'next/server';
import {
   GITHUB_PKCE_COOKIE,
   GITHUB_STATE_COOKIE,
   githubAppReadiness,
   githubUserAuthorizationUrl,
   hashGithubOAuthState,
   opaqueTokensMatch,
} from '@/lib/integrations/github/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export const runtime = 'nodejs';

const INSTALLATION_ID_PATTERN = /^[1-9][0-9]{0,19}$/;

function invalidSetup(message = 'Invalid GitHub installation setup.') {
   return NextResponse.json(
      { error: message },
      { status: 400, headers: { 'Cache-Control': 'private, no-store' } }
   );
}

export async function GET(request: NextRequest) {
   if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
   }

   const readiness = githubAppReadiness();
   if (!readiness.available) {
      return NextResponse.json(
         { error: readiness.reason },
         { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
      );
   }

   const installationId = request.nextUrl.searchParams.get('installation_id');
   const state = request.nextUrl.searchParams.get('state');
   const setupAction = request.nextUrl.searchParams.get('setup_action');
   const cookieState = request.cookies.get(GITHUB_STATE_COOKIE)?.value;
   const pkceVerifier = request.cookies.get(GITHUB_PKCE_COOKIE)?.value;

   if (!installationId || !INSTALLATION_ID_PATTERN.test(installationId)) return invalidSetup();
   if (!opaqueTokensMatch(state, cookieState)) return invalidSetup();
   if (!pkceVerifier || pkceVerifier.length < 43 || pkceVerifier.length > 128) return invalidSetup();
   if (setupAction && setupAction !== 'install' && setupAction !== 'update') return invalidSetup();

   const supabase = await createClient();
   const { data: claimsData } = await supabase.auth.getClaims();
   if (!claimsData?.claims?.sub) {
      return NextResponse.json(
         { error: 'Unauthorized.' },
         { status: 401, headers: { 'Cache-Control': 'private, no-store' } }
      );
   }

   const stateHash = hashGithubOAuthState(state!);
   const { data, error } = await supabase.rpc('record_integration_authorization_candidate', {
      p_state_hash: stateHash,
      p_external_id: installationId,
   });
   if (error || !data?.[0]) return invalidSetup('This GitHub connection request is invalid or expired.');

   const response = NextResponse.redirect(githubUserAuthorizationUrl(state!, pkceVerifier));
   response.headers.set('Cache-Control', 'private, no-store');
   return response;
}
