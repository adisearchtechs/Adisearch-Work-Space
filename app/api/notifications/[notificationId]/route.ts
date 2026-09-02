import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { notificationReadSchema } from '@/lib/notifications/contracts';
import { authorizeNotificationAccess, isNotificationUuid } from '@/lib/notifications/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function PATCH(
   request: NextRequest,
   { params }: { params: Promise<{ notificationId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }
   const { notificationId } = await params;
   if (!isNotificationUuid(notificationId)) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return NextResponse.json({ error: 'Invalid request body.' }, { status });
   }
   const parsed = notificationReadSchema.safeParse(input);
   if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid notification update.' }, { status: 400 });
   }

   const context = await authorizeNotificationAccess(request, 'Unable to update notification.');
   if (!context.ok) return context.response;
   const { data, error } = await context.supabase
      .from('notifications')
      .update({ read_at: parsed.data.read ? new Date().toISOString() : null })
      .eq('id', notificationId)
      .eq('organization_id', context.organizationId)
      .eq('recipient_id', context.userId)
      .select('id')
      .maybeSingle();
   if (error) {
      return NextResponse.json({ error: 'Unable to update notification.' }, { status: 500 });
   }
   if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   return new NextResponse(null, { status: 204 });
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ notificationId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }
   const { notificationId } = await params;
   if (!isNotificationUuid(notificationId)) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   const context = await authorizeNotificationAccess(request, 'Unable to delete notification.');
   if (!context.ok) return context.response;
   const { data, error } = await context.supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('organization_id', context.organizationId)
      .eq('recipient_id', context.userId)
      .select('id')
      .maybeSingle();
   if (error) {
      return NextResponse.json({ error: 'Unable to delete notification.' }, { status: 500 });
   }
   if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   return new NextResponse(null, { status: 204 });
}
