import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { createSavedViewSchema } from '@/lib/views/contracts';
import {
   authorizeSavedViewAccess,
   SAVED_VIEW_SELECT,
   toSavedViewDto,
   validateSavedViewTeam,
} from '@/lib/views/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function GET(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();
   const context = await authorizeSavedViewAccess(request, false, 'Unable to load saved views.');
   if (!context.ok) return context.response;

   const { data: rows, error } = await context.supabase
      .from('saved_views')
      .select(SAVED_VIEW_SELECT)
      .eq('organization_id', context.organizationId)
      .order('updated_at', { ascending: false })
      .limit(300);
   if (error) return NextResponse.json({ error: 'Unable to load saved views.' }, { status: 500 });

   const ownerIds = [...new Set((rows ?? []).map((row) => row.owner_id))];
   const profilesResult = ownerIds.length
      ? await context.supabase
           .from('profiles')
           .select('id, display_name, avatar_url')
           .in('id', ownerIds)
      : { data: [], error: null };
   if (profilesResult.error) {
      return NextResponse.json({ error: 'Unable to load saved views.' }, { status: 500 });
   }
   const profileById = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
   const views = (rows ?? []).map((row) =>
      toSavedViewDto(row, profileById.get(row.owner_id), context.userId, context.role)
   );

   return NextResponse.json(
      { views, canWrite: context.role !== 'guest' },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}

export async function POST(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return NextResponse.json({ error: 'Invalid request body.' }, { status });
   }
   const parsed = createSavedViewSchema.safeParse(input);
   if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid saved view.' }, { status: 400 });
   }

   const context = await authorizeSavedViewAccess(request, true, 'Unable to create saved view.');
   if (!context.ok) return context.response;
   const teamValidation = await validateSavedViewTeam(
      context,
      parsed.data.teamId,
      'Unable to create saved view.'
   );
   if (!teamValidation.ok) return teamValidation.response;

   const { data: row, error } = await context.supabase
      .from('saved_views')
      .insert({
         organization_id: context.organizationId,
         team_id: parsed.data.teamId ?? null,
         owner_id: context.userId,
         name: parsed.data.name,
         description: parsed.data.description,
         icon: parsed.data.icon,
         view_type: parsed.data.viewType,
         filter: parsed.data.filter,
      })
      .select(SAVED_VIEW_SELECT)
      .single();
   if (error || !row) {
      return NextResponse.json({ error: 'Unable to create saved view.' }, { status: 500 });
   }

   const { data: owner } = await context.supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', context.userId)
      .maybeSingle();
   return NextResponse.json(
      { view: toSavedViewDto(row, owner ?? undefined, context.userId, context.role) },
      { status: 201 }
   );
}
