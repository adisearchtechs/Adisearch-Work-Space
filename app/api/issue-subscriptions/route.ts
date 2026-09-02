import { NextResponse, type NextRequest } from 'next/server';
import { authorizeIssueSubscriptionAccess } from '@/lib/issue-subscriptions/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function GET(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();

   const context = await authorizeIssueSubscriptionAccess(
      request,
      'Unable to load issue subscriptions.'
   );
   if (!context.ok) return context.response;

   const { data, error } = await context.supabase
      .from('issue_subscriptions')
      .select('issue_id')
      .eq('organization_id', context.organizationId)
      .eq('user_id', context.userId)
      .order('created_at', { ascending: false });
   if (error) {
      return NextResponse.json({ error: 'Unable to load issue subscriptions.' }, { status: 500 });
   }

   return NextResponse.json(
      { issueIds: (data ?? []).map((subscription) => subscription.issue_id) },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}
