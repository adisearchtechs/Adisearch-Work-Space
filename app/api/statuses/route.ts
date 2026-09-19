import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { authorizeWorkspaceMemberAccess } from '@/lib/workspace-members/server';
import {
   createWorkspaceStatusSchema,
   reorderWorkspaceStatusesSchema,
   type WorkspaceStatusDto,
} from '@/lib/workspace-statuses/contracts';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

function statusSlug(name: string) {
   return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48)
      .replace(/-+$/g, '');
}

async function readMutationBody(request: NextRequest) {
   try {
      return { input: await readJsonBody(request) } as const;
   } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return {
         response: NextResponse.json({ error: 'Invalid request body.' }, { status }),
      } as const;
   }
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

export async function POST(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const body = await readMutationBody(request);
   if ('response' in body) return body.response;

   const parsed = createWorkspaceStatusSchema.safeParse(body.input);
   if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid workspace status.' }, { status: 400 });
   }

   const slug = statusSlug(parsed.data.name);
   if (!slug) {
      return NextResponse.json({ error: 'Status name must contain a letter or number.' }, { status: 400 });
   }

   const context = await authorizeWorkspaceMemberAccess(
      request,
      true,
      'Unable to create workspace status.'
   );
   if ('response' in context) return context.response;

   const { data: lastStatus, error: positionError } = await context.supabase
      .from('statuses')
      .select('position')
      .eq('organization_id', context.organizationId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();

   if (positionError) {
      return NextResponse.json({ error: 'Unable to create workspace status.' }, { status: 500 });
   }

   const position = Math.min((lastStatus?.position ?? 0) + 10, 32767);
   const { data, error } = await context.supabase
      .from('statuses')
      .insert({
         organization_id: context.organizationId,
         name: parsed.data.name,
         slug,
         color: parsed.data.color.toUpperCase(),
         category: parsed.data.category,
         position,
      })
      .select('id, name, slug, color, category, position')
      .single();

   if (error) {
      if (error.code === '23505') {
         return NextResponse.json(
            { error: 'A status with that generated slug already exists.' },
            { status: 409 }
         );
      }
      return NextResponse.json({ error: 'Unable to create workspace status.' }, { status: 500 });
   }

   return NextResponse.json({ status: data satisfies WorkspaceStatusDto }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const body = await readMutationBody(request);
   if ('response' in body) return body.response;

   const parsed = reorderWorkspaceStatusesSchema.safeParse(body.input);
   if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid status order.' }, { status: 400 });
   }

   const context = await authorizeWorkspaceMemberAccess(
      request,
      true,
      'Unable to reorder workspace statuses.'
   );
   if ('response' in context) return context.response;

   const { data: current, error: loadError } = await context.supabase
      .from('statuses')
      .select('id, organization_id, name, slug, color, category, position')
      .eq('organization_id', context.organizationId)
      .order('position')
      .order('name');

   if (loadError) {
      return NextResponse.json({ error: 'Unable to reorder workspace statuses.' }, { status: 500 });
   }

   const requested = parsed.data.orderedStatusIds;
   const currentIds = new Set((current ?? []).map((status) => status.id));
   if (requested.length !== currentIds.size || requested.some((id) => !currentIds.has(id))) {
      return NextResponse.json(
         { error: 'Status order must contain every current workspace status exactly once.' },
         { status: 409 }
      );
   }

   const byId = new Map((current ?? []).map((status) => [status.id, status]));
   const rows = requested.map((id, index) => {
      const status = byId.get(id)!;
      return {
         id: status.id,
         organization_id: status.organization_id,
         name: status.name,
         slug: status.slug,
         color: status.color,
         category: status.category,
         position: (index + 1) * 10,
      };
   });

   const { data, error } = await context.supabase
      .from('statuses')
      .upsert(rows)
      .select('id, name, slug, color, category, position');

   if (error) {
      return NextResponse.json({ error: 'Unable to reorder workspace statuses.' }, { status: 500 });
   }

   const positions = new Map(requested.map((id, index) => [id, index]));
   const statuses = (data ?? []).sort(
      (left, right) => (positions.get(left.id) ?? 0) - (positions.get(right.id) ?? 0)
   );

   return NextResponse.json({ statuses });
}
