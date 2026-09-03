import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { profilePatchSchema, type ProfileSettingsDto } from '@/lib/profile/contracts';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

async function authenticatedClient() {
   const supabase = await createClient();
   const { data: claimsData } = await supabase.auth.getClaims();
   return { supabase, userId: claimsData?.claims?.sub ?? null };
}

function toDto(row: {
   display_name: string | null;
   avatar_url: string | null;
   timezone: string;
}): ProfileSettingsDto {
   return {
      displayName: row.display_name || 'Workspace member',
      avatarUrl: row.avatar_url,
      timezone: row.timezone,
   };
}

export async function GET() {
   if (!isSupabaseConfigured()) return unavailable();

   const { supabase, userId } = await authenticatedClient();
   if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

   const { data: profile, error } = await supabase
      .from('profiles')
      .select('display_name, avatar_url, timezone')
      .eq('id', userId)
      .maybeSingle();

   if (error) {
      return NextResponse.json({ error: 'Unable to load profile settings.' }, { status: 500 });
   }
   if (!profile) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });

   return NextResponse.json(
      { profile: toDto(profile) },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}

export async function PATCH(request: NextRequest) {
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

   const parsed = profilePatchSchema.safeParse(input);
   if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid profile settings.' }, { status: 400 });
   }

   const { supabase, userId } = await authenticatedClient();
   if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

   const { data: profile, error } = await supabase
      .from('profiles')
      .update({
         display_name: parsed.data.displayName,
         timezone: parsed.data.timezone,
         updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('display_name, avatar_url, timezone')
      .maybeSingle();

   if (error) {
      return NextResponse.json({ error: 'Unable to save profile settings.' }, { status: 500 });
   }
   if (!profile) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });

   return NextResponse.json(
      { profile: toDto(profile) },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}
