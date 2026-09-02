import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin } from '@/lib/api/security';
import {
   authorizeIssueSubscriptionAccess,
   isIssueSubscriptionUuid,
} from '@/lib/issue-subscriptions/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function POST(
   request: NextRequest,
   { params }: { params: Promise<{ issueId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const { issueId } = await params;
   if (!isIssueSubscriptionUuid(issueId)) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   const context = await authorizeIssueSubscriptionAccess(
      request,
      'Unable to subscribe to issue.'
   );
   if (!context.ok) return context.response;

   const { data: issue, error: issueError } = await context.supabase
      .from('issues')
      .select('id')
      .eq('id', issueId)
      .eq('organization_id', context.organizationId)
      .maybeSingle();
   if (issueError) {
      return NextResponse.json({ error: 'Unable to subscribe to issue.' }, { status: 500 });
   }
   if (!issue) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   const { error } = await context.supabase.from('issue_subscriptions').insert({
      issue_id: issueId,
      user_id: context.userId,
      organization_id: context.organizationId,
   });
   if (error && error.code !== '23505') {
      return NextResponse.json({ error: 'Unable to subscribe to issue.' }, { status: 500 });
   }

   return new NextResponse(null, { status: 204 });
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ issueId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const { issueId } = await params;
   if (!isIssueSubscriptionUuid(issueId)) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   const context = await authorizeIssueSubscriptionAccess(
      request,
      'Unable to unsubscribe from issue.'
   );
   if (!context.ok) return context.response;

   const { error } = await context.supabase
      .from('issue_subscriptions')
      .delete()
      .eq('issue_id', issueId)
      .eq('organization_id', context.organizationId)
      .eq('user_id', context.userId);
   if (error) {
      return NextResponse.json({ error: 'Unable to unsubscribe from issue.' }, { status: 500 });
   }

   return new NextResponse(null, { status: 204 });
}
