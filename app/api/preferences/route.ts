import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import {
   themePreferencesSchema,
   type ThemePreferencesDto,
} from '@/lib/preferences/contracts';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

type PreferenceRow = {
   theme_mode: ThemePreferencesDto['mode'];
   light_variant: ThemePreferencesDto['lightVariant'];
   dark_variant: ThemePreferencesDto['darkVariant'];
   custom_accent: string;
   custom_background: string;
   custom_contrast: number;
   custom_sidebar: boolean;
   custom_sidebar_accent: string;
   custom_sidebar_background: string;
   custom_sidebar_contrast: number;
};

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

async function authenticatedClient() {
   const supabase = await createClient();
   const { data: claimsData } = await supabase.auth.getClaims();
   return { supabase, userId: claimsData?.claims?.sub ?? null };
}

function toDto(row: PreferenceRow): ThemePreferencesDto {
   return {
      mode: row.theme_mode,
      lightVariant: row.light_variant,
      darkVariant: row.dark_variant,
      custom: {
         accent: row.custom_accent,
         background: row.custom_background,
         contrast: row.custom_contrast,
         sidebar: row.custom_sidebar,
         sidebarAccent: row.custom_sidebar_accent,
         sidebarBackground: row.custom_sidebar_background,
         sidebarContrast: row.custom_sidebar_contrast,
      },
   };
}

const preferenceColumns =
   'theme_mode, light_variant, dark_variant, custom_accent, custom_background, custom_contrast, custom_sidebar, custom_sidebar_accent, custom_sidebar_background, custom_sidebar_contrast';

export async function GET() {
   if (!isSupabaseConfigured()) return unavailable();

   const { supabase, userId } = await authenticatedClient();
   if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

   const { data: preferences, error } = await supabase
      .from('user_preferences')
      .select(preferenceColumns)
      .eq('user_id', userId)
      .maybeSingle();

   if (error) {
      return NextResponse.json({ error: 'Unable to load preferences.' }, { status: 500 });
   }

   return NextResponse.json(
      { preferences: preferences ? toDto(preferences) : null },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}

export async function PUT(request: NextRequest) {
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

   const parsed = themePreferencesSchema.safeParse(input);
   if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid preferences.' }, { status: 400 });
   }

   const { supabase, userId } = await authenticatedClient();
   if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

   const preferences = parsed.data;
   const { data: saved, error } = await supabase
      .from('user_preferences')
      .upsert(
         {
            user_id: userId,
            theme_mode: preferences.mode,
            light_variant: preferences.lightVariant,
            dark_variant: preferences.darkVariant,
            custom_accent: preferences.custom.accent,
            custom_background: preferences.custom.background,
            custom_contrast: preferences.custom.contrast,
            custom_sidebar: preferences.custom.sidebar,
            custom_sidebar_accent: preferences.custom.sidebarAccent,
            custom_sidebar_background: preferences.custom.sidebarBackground,
            custom_sidebar_contrast: preferences.custom.sidebarContrast,
            updated_at: new Date().toISOString(),
         },
         { onConflict: 'user_id' }
      )
      .select(preferenceColumns)
      .single();

   if (error) {
      return NextResponse.json({ error: 'Unable to save preferences.' }, { status: 500 });
   }

   return NextResponse.json(
      { preferences: toDto(saved) },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}
