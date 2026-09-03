import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { authorizeWorkspaceMemberAccess } from '@/lib/workspace-members/server';
import {
   workspaceSettingsPatchSchema,
   type WorkspaceSettingsDto,
} from '@/lib/workspace-settings/contracts';

function toDto(row: { id: string; name: string; slug: string }): WorkspaceSettingsDto {
   return { id: row.id, name: row.name, slug: row.slug };
}

export async function GET(request: NextRequest) {
   const context = await authorizeWorkspaceMemberAccess(
      request,
      false,
      'Unable to load workspace settings.'
   );
   if ('response' in context) return context.response;

   const { data: organization, error } = await context.supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('id', context.organizationId)
      .maybeSingle();

   if (error) {
      return NextResponse.json({ error: 'Unable to load workspace settings.' }, { status: 500 });
   }
   if (!organization) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   return NextResponse.json(
      { workspace: toDto(organization), canManage: context.role === 'owner' || context.role === 'admin' },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}

export async function PATCH(request: NextRequest) {
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const context = await authorizeWorkspaceMemberAccess(
      request,
      true,
      'Unable to save workspace settings.'
   );
   if ('response' in context) return context.response;

   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return NextResponse.json({ error: 'Invalid request body.' }, { status });
   }

   const parsed = workspaceSettingsPatchSchema.safeParse(input);
   if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid workspace settings.' }, { status: 400 });
   }

   const { data: organization, error } = await context.supabase
      .from('organizations')
      .update({ name: parsed.data.name, updated_at: new Date().toISOString() })
      .eq('id', context.organizationId)
      .select('id, name, slug')
      .maybeSingle();

   if (error) {
      return NextResponse.json({ error: 'Unable to save workspace settings.' }, { status: 500 });
   }
   if (!organization) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   return NextResponse.json(
      { workspace: toDto(organization) },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}
