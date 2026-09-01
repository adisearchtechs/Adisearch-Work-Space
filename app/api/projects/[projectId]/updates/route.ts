import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import {
   createProjectUpdateSchema,
   type ProjectUpdateDto,
   type ProjectUpdateHealth,
   type ProjectUpdateKind,
} from '@/lib/project-updates/contracts';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ORGANIZATION_SLUG_PATTERN = /^[a-z0-9-]{2,48}$/;

type ProjectUpdateRow = {
   id: string;
   project_id: string;
   author_id: string | null;
   kind: ProjectUpdateKind;
   health: ProjectUpdateHealth | null;
   body: string;
   created_at: string;
};

type ProfileRow = {
   id: string;
   display_name: string | null;
   avatar_url: string | null;
};

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

function toDto(row: ProjectUpdateRow, profileById: Map<string, ProfileRow>): ProjectUpdateDto {
   const profile = row.author_id ? profileById.get(row.author_id) : undefined;
   return {
      id: row.id,
      projectId: row.project_id,
      kind: row.kind,
      health: row.health,
      body: row.body,
      createdAt: row.created_at,
      author: {
         id: row.author_id,
         displayName: profile?.display_name || 'Former workspace member',
         avatarUrl: profile?.avatar_url ?? null,
      },
   };
}

async function authorizeProjectAccess(
   request: NextRequest,
   projectId: string,
   requireWrite: boolean,
   failureMessage: string
) {
   const organizationSlug = request.nextUrl.searchParams.get('organization');
   if (!organizationSlug || !ORGANIZATION_SLUG_PATTERN.test(organizationSlug)) {
      return {
         response: NextResponse.json({ error: 'Invalid organization.' }, { status: 400 }),
      };
   }

   const supabase = await createClient();
   const { data: claimsData } = await supabase.auth.getClaims();
   const userId = claimsData?.claims?.sub;
   if (!userId) {
      return { response: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) };
   }

   const { data: organization, error: organizationError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', organizationSlug)
      .maybeSingle();
   if (organizationError) {
      return { response: NextResponse.json({ error: failureMessage }, { status: 500 }) };
   }
   if (!organization) {
      return { response: NextResponse.json({ error: 'Not found.' }, { status: 404 }) };
   }

   const [{ data: membership, error: membershipError }, { data: project, error: projectError }] =
      await Promise.all([
         supabase
            .from('organization_members')
            .select('role')
            .eq('organization_id', organization.id)
            .eq('user_id', userId)
            .maybeSingle(),
         supabase
            .from('projects')
            .select('id')
            .eq('id', projectId)
            .eq('organization_id', organization.id)
            .maybeSingle(),
      ]);

   if (membershipError || projectError) {
      return { response: NextResponse.json({ error: failureMessage }, { status: 500 }) };
   }
   if (!membership || (requireWrite && membership.role === 'guest')) {
      return { response: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) };
   }
   if (!project) {
      return { response: NextResponse.json({ error: 'Not found.' }, { status: 404 }) };
   }

   return { supabase, organizationId: organization.id, userId };
}

async function loadProfiles(
   supabase: Awaited<ReturnType<typeof createClient>>,
   authorIds: string[]
) {
   if (authorIds.length === 0) return new Map<string, ProfileRow>();

   const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', authorIds);
   if (error) throw error;

   const rows = (profiles ?? []) as ProfileRow[];
   return new Map(rows.map((profile) => [profile.id, profile]));
}

export async function GET(
   request: NextRequest,
   { params }: { params: Promise<{ projectId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();

   const { projectId } = await params;
   if (!UUID_PATTERN.test(projectId)) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   const context = await authorizeProjectAccess(
      request,
      projectId,
      false,
      'Unable to load project updates.'
   );
   if ('response' in context) return context.response;
   const { supabase, organizationId } = context;

   const { data, error } = await supabase
      .from('project_updates')
      .select('id, project_id, author_id, kind, health, body, created_at')
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(200);

   if (error) {
      return NextResponse.json({ error: 'Unable to load project updates.' }, { status: 500 });
   }

   const rows = (data ?? []) as ProjectUpdateRow[];
   const authorIds = [
      ...new Set(rows.flatMap((row) => (row.author_id ? [row.author_id] : []))),
   ];

   try {
      const profileById = await loadProfiles(supabase, authorIds);
      return NextResponse.json(
         { updates: rows.map((row) => toDto(row, profileById)) },
         { headers: { 'Cache-Control': 'private, no-store' } }
      );
   } catch {
      return NextResponse.json({ error: 'Unable to load project updates.' }, { status: 500 });
   }
}

export async function POST(
   request: NextRequest,
   { params }: { params: Promise<{ projectId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const { projectId } = await params;
   if (!UUID_PATTERN.test(projectId)) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return NextResponse.json({ error: 'Invalid request body.' }, { status });
   }

   const parsed = createProjectUpdateSchema.safeParse(input);
   if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid project update.' }, { status: 400 });
   }

   const context = await authorizeProjectAccess(
      request,
      projectId,
      true,
      'Unable to post project update.'
   );
   if ('response' in context) return context.response;
   const { supabase, organizationId, userId } = context;

   const { data, error } = await supabase
      .from('project_updates')
      .insert({
         organization_id: organizationId,
         project_id: projectId,
         author_id: userId,
         kind: parsed.data.kind,
         health: parsed.data.kind === 'update' ? parsed.data.health! : null,
         body: parsed.data.body,
      })
      .select('id, project_id, author_id, kind, health, body, created_at')
      .single();

   if (error || !data) {
      return NextResponse.json({ error: 'Unable to post project update.' }, { status: 500 });
   }

   try {
      const profileById = await loadProfiles(supabase, [userId]);
      return NextResponse.json(
         { update: toDto(data as ProjectUpdateRow, profileById) },
         { status: 201 }
      );
   } catch {
      return NextResponse.json({ error: 'Unable to post project update.' }, { status: 500 });
   }
}
