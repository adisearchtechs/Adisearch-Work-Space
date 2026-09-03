import { NextResponse, type NextRequest } from 'next/server';
import { mapIntegrationConnection } from '@/lib/integrations/contracts';
import { githubAppReadiness } from '@/lib/integrations/github/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { authorizeWorkspaceMemberAccess } from '@/lib/workspace-members/server';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function GET(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();

   const context = await authorizeWorkspaceMemberAccess(
      request,
      false,
      'Unable to load integration connections.'
   );
   if ('response' in context) return context.response;

   const { data, error } = await context.supabase
      .from('integration_connections')
      .select(
         'id, provider, connection_scope, status, external_account_id, external_account_label, scopes, connected_at, last_verified_at, disconnected_at, last_error_code'
      )
      .eq('organization_id', context.organizationId)
      .order('provider');

   if (error) {
      return NextResponse.json({ error: 'Unable to load integration connections.' }, { status: 500 });
   }

   return NextResponse.json(
      {
         connections: (data ?? []).map(mapIntegrationConnection),
         providers: { github: githubAppReadiness() },
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}
