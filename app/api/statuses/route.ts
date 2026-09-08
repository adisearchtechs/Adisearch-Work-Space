import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { authorizeWorkspaceMemberAccess } from '@/lib/workspace-members/server';
import type { WorkspaceStatusDto } from '@/lib/workspace-statuses/contracts';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function GET(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();

   const context = await authorizeWorkspaceMemberAccess(
      request,
      false,
      'Unable to load workspace statuses.'
   );
   if ('response' in context) return context.response;

   const { data, error } = await context.supabase
      .from('statuses')
      .select('id, name, slug, color, category, position')
      .eq('organization_id', context.organizationId)
      .order('position')
      .order('name');

   if (error) {
      return NextResponse.json({ error: 'Unable to load workspace statuses.' }, { status: 500 });
   }

   const statuses: WorkspaceStatusDto[] = (data ?? []).map((status) => ({
      id: status.id,
      name: status.name,
      slug: status.slug,
      color: status.color,
      category: status.category,
      position: status.position,
   }));

   return NextResponse.json(
      { statuses },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}
