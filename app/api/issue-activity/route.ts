import { NextResponse, type NextRequest } from 'next/server';
import type { IssueActivityEventDto } from '@/lib/issue-activity/contracts';
import {
   authorizeIssueActivityAccess,
   issueExistsInActivityScope,
   UUID_PATTERN,
} from '@/lib/issue-activity/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function asDetails(value: unknown): Record<string, unknown> {
   return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
}

export async function GET(request: NextRequest) {
   if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
   }

   const issueId = request.nextUrl.searchParams.get('issueId');
   if (!issueId || !UUID_PATTERN.test(issueId)) {
      return NextResponse.json({ error: 'Invalid issue.' }, { status: 400 });
   }

   const context = await authorizeIssueActivityAccess(request);
   if (!context.ok) return context.response;
   if (!(await issueExistsInActivityScope(context, issueId))) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   const { data, error } = await context.supabase
      .from('issue_audit_events')
      .select('id, actor_id, actor_display_name, event_type, details, created_at')
      .eq('organization_id', context.organizationId)
      .eq('issue_id', issueId)
      .order('created_at', { ascending: true })
      .limit(500);
   if (error) {
      return NextResponse.json({ error: 'Unable to load issue activity.' }, { status: 500 });
   }

   const rows = data ?? [];
   const actorIds = [...new Set(rows.flatMap((row) => (row.actor_id ? [row.actor_id] : [])))];
   const profileResult = actorIds.length
      ? await context.supabase.from('profiles').select('id, avatar_url').in('id', actorIds)
      : { data: [], error: null };
   if (profileResult.error) {
      return NextResponse.json({ error: 'Unable to load issue activity.' }, { status: 500 });
   }
   const avatarByActorId = new Map(
      (profileResult.data ?? []).map((profile) => [profile.id, profile.avatar_url])
   );

   const events: IssueActivityEventDto[] = rows.map((row) => ({
      id: row.id,
      eventType: row.event_type,
      actor: {
         id: row.actor_id,
         displayName: row.actor_display_name,
         avatarUrl: row.actor_id ? (avatarByActorId.get(row.actor_id) ?? null) : null,
      },
      details: asDetails(row.details),
      createdAt: row.created_at,
   }));

   return NextResponse.json(
      { events },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}
