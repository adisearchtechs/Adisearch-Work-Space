import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import {
   createInitiativeUpdateSchema,
   type InitiativeUpdateDto,
   type InitiativeUpdateHealth,
   type InitiativeUpdateKind,
} from '@/lib/initiative-updates/contracts';
import { authorizeInitiativeAccess, isUuid } from '@/lib/initiatives/server';
import type { Database } from '@/lib/supabase/database.types';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

type InitiativeUpdateRow = Pick<
   Database['public']['Tables']['initiative_updates']['Row'],
   'id' | 'initiative_id' | 'author_id' | 'kind' | 'health' | 'body' | 'created_at'
>;

type ProfileRow = Pick<
   Database['public']['Tables']['profiles']['Row'],
   'id' | 'display_name' | 'avatar_url'
>;

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

function toDto(row: InitiativeUpdateRow, profileById: Map<string, ProfileRow>): InitiativeUpdateDto {
   const profile = row.author_id ? profileById.get(row.author_id) : undefined;
   return {
      id: row.id,
      initiativeId: row.initiative_id,
      kind: row.kind as InitiativeUpdateKind,
      health: row.health as InitiativeUpdateHealth | null,
      body: row.body,
      createdAt: row.created_at,
      author: {
         id: row.author_id,
         displayName: profile?.display_name || 'Former workspace member',
         avatarUrl: profile?.avatar_url ?? null,
      },
   };
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
   { params }: { params: Promise<{ initiativeId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();

   const { initiativeId } = await params;
   if (!isUuid(initiativeId)) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   const context = await authorizeInitiativeAccess(
      request,
      false,
      'Unable to load initiative updates.',
      initiativeId
   );
   if ('response' in context) return context.response;

   const { data, error } = await context.supabase
      .from('initiative_updates')
      .select('id, initiative_id, author_id, kind, health, body, created_at')
      .eq('organization_id', context.organizationId)
      .eq('initiative_id', initiativeId)
      .order('created_at', { ascending: false })
      .limit(200);

   if (error) {
      return NextResponse.json({ error: 'Unable to load initiative updates.' }, { status: 500 });
   }

   const rows = (data ?? []) as InitiativeUpdateRow[];
   const authorIds = [...new Set(rows.flatMap((row) => (row.author_id ? [row.author_id] : [])))];

   try {
      const profileById = await loadProfiles(context.supabase, authorIds);
      return NextResponse.json(
         { updates: rows.map((row) => toDto(row, profileById)) },
         { headers: { 'Cache-Control': 'private, no-store' } }
      );
   } catch {
      return NextResponse.json({ error: 'Unable to load initiative updates.' }, { status: 500 });
   }
}

export async function POST(
   request: NextRequest,
   { params }: { params: Promise<{ initiativeId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const { initiativeId } = await params;
   if (!isUuid(initiativeId)) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return NextResponse.json({ error: 'Invalid request body.' }, { status });
   }

   const parsed = createInitiativeUpdateSchema.safeParse(input);
   if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid initiative update.' }, { status: 400 });
   }

   const context = await authorizeInitiativeAccess(
      request,
      true,
      'Unable to post initiative update.',
      initiativeId
   );
   if ('response' in context) return context.response;

   const { data, error } = await context.supabase
      .from('initiative_updates')
      .insert({
         organization_id: context.organizationId,
         initiative_id: initiativeId,
         author_id: context.userId,
         kind: parsed.data.kind,
         health: parsed.data.kind === 'update' ? parsed.data.health! : null,
         body: parsed.data.body,
      })
      .select('id, initiative_id, author_id, kind, health, body, created_at')
      .single();

   if (error || !data) {
      return NextResponse.json({ error: 'Unable to post initiative update.' }, { status: 500 });
   }

   try {
      const profileById = await loadProfiles(context.supabase, [context.userId]);
      return NextResponse.json(
         { update: toDto(data as InitiativeUpdateRow, profileById) },
         { status: 201 }
      );
   } catch {
      return NextResponse.json({ error: 'Unable to post initiative update.' }, { status: 500 });
   }
}
