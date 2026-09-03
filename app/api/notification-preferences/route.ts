import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import {
   DEFAULT_NOTIFICATION_PREFERENCES,
   notificationPreferencesSchema,
   type NotificationPreferencesDto,
} from '@/lib/notifications/preferences-contracts';
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
   notify_issue_assignment: boolean;
   notify_issue_status: boolean;
}): NotificationPreferencesDto {
   return {
      issueAssignment: row.notify_issue_assignment,
      issueStatus: row.notify_issue_status,
   };
}

export async function GET() {
   if (!isSupabaseConfigured()) return unavailable();

   const { supabase, userId } = await authenticatedClient();
   if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

   const { data, error } = await supabase
      .from('user_preferences')
      .select('notify_issue_assignment, notify_issue_status')
      .eq('user_id', userId)
      .maybeSingle();

   if (error) {
      return NextResponse.json({ error: 'Unable to load notification preferences.' }, { status: 500 });
   }

   return NextResponse.json(
      { preferences: data ? toDto(data) : DEFAULT_NOTIFICATION_PREFERENCES },
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

   const parsed = notificationPreferencesSchema.safeParse(input);
   if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid notification preferences.' }, { status: 400 });
   }

   const { supabase, userId } = await authenticatedClient();
   if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

   const { data, error } = await supabase
      .from('user_preferences')
      .upsert(
         {
            user_id: userId,
            notify_issue_assignment: parsed.data.issueAssignment,
            notify_issue_status: parsed.data.issueStatus,
            updated_at: new Date().toISOString(),
         },
         { onConflict: 'user_id' }
      )
      .select('notify_issue_assignment, notify_issue_status')
      .single();

   if (error) {
      return NextResponse.json({ error: 'Unable to save notification preferences.' }, { status: 500 });
   }

   return NextResponse.json(
      { preferences: toDto(data) },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}
