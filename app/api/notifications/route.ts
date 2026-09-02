import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin } from '@/lib/api/security';
import type { NotificationDto } from '@/lib/notifications/contracts';
import { authorizeNotificationAccess } from '@/lib/notifications/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function GET(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();
   const context = await authorizeNotificationAccess(request, 'Unable to load notifications.');
   if (!context.ok) return context.response;

   const { data: rows, error } = await context.supabase
      .from('notifications')
      .select('id, actor_id, issue_id, kind, content, read_at, created_at')
      .eq('organization_id', context.organizationId)
      .eq('recipient_id', context.userId)
      .order('created_at', { ascending: false })
      .limit(200);
   if (error) {
      return NextResponse.json({ error: 'Unable to load notifications.' }, { status: 500 });
   }

   const actorIds = [...new Set((rows ?? []).flatMap((row) => (row.actor_id ? [row.actor_id] : [])))];
   const issueIds = [...new Set((rows ?? []).flatMap((row) => (row.issue_id ? [row.issue_id] : [])))];

   const [profilesResult, issuesResult] = await Promise.all([
      actorIds.length
         ? context.supabase.from('profiles').select('id, display_name, avatar_url').in('id', actorIds)
         : Promise.resolve({ data: [], error: null }),
      issueIds.length
         ? context.supabase
              .from('issues')
              .select('id, issue_number, title, status_id, priority, team_id')
              .eq('organization_id', context.organizationId)
              .in('id', issueIds)
         : Promise.resolve({ data: [], error: null }),
   ]);
   if (profilesResult.error || issuesResult.error) {
      return NextResponse.json({ error: 'Unable to load notifications.' }, { status: 500 });
   }

   const issues = issuesResult.data ?? [];
   const teamIds = [...new Set(issues.map((issue) => issue.team_id))];
   const statusIds = [...new Set(issues.map((issue) => issue.status_id))];
   const [teamsResult, statusesResult] = await Promise.all([
      teamIds.length
         ? context.supabase
              .from('teams')
              .select('id, issue_prefix')
              .eq('organization_id', context.organizationId)
              .in('id', teamIds)
         : Promise.resolve({ data: [], error: null }),
      statusIds.length
         ? context.supabase
              .from('statuses')
              .select('id, name, slug')
              .eq('organization_id', context.organizationId)
              .in('id', statusIds)
         : Promise.resolve({ data: [], error: null }),
   ]);
   if (teamsResult.error || statusesResult.error) {
      return NextResponse.json({ error: 'Unable to load notifications.' }, { status: 500 });
   }

   const profileById = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
   const issueById = new Map(issues.map((issue) => [issue.id, issue]));
   const prefixByTeamId = new Map((teamsResult.data ?? []).map((team) => [team.id, team.issue_prefix]));
   const statusById = new Map((statusesResult.data ?? []).map((status) => [status.id, status]));

   const notifications: NotificationDto[] = (rows ?? []).map((row) => {
      const actor = row.actor_id ? profileById.get(row.actor_id) : undefined;
      const issue = row.issue_id ? issueById.get(row.issue_id) : undefined;
      const status = issue ? statusById.get(issue.status_id) : undefined;
      return {
         id: row.id,
         kind: row.kind as NotificationDto['kind'],
         content: row.content,
         readAt: row.read_at,
         createdAt: row.created_at,
         actor: row.actor_id
            ? {
                 id: row.actor_id,
                 displayName: actor?.display_name || 'Workspace member',
                 avatarUrl: actor?.avatar_url ?? null,
              }
            : null,
         issue: issue
            ? {
                 id: issue.id,
                 identifier: `${prefixByTeamId.get(issue.team_id) ?? 'ISS'}-${issue.issue_number}`,
                 title: issue.title,
                 statusName: status?.name ?? 'Unknown status',
                 statusSlug: status?.slug ?? 'unknown',
                 priorityId: issue.priority,
              }
            : null,
      };
   });

   return NextResponse.json(
      { notifications },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}

export async function PATCH(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }
   const context = await authorizeNotificationAccess(request, 'Unable to update notifications.');
   if (!context.ok) return context.response;

   const { error } = await context.supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('organization_id', context.organizationId)
      .eq('recipient_id', context.userId)
      .is('read_at', null);
   if (error) {
      return NextResponse.json({ error: 'Unable to update notifications.' }, { status: 500 });
   }
   return new NextResponse(null, { status: 204 });
}

export async function DELETE(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }
   const scope = request.nextUrl.searchParams.get('scope') ?? 'all';
   if (scope !== 'all' && scope !== 'read') {
      return NextResponse.json({ error: 'Invalid delete scope.' }, { status: 400 });
   }
   const context = await authorizeNotificationAccess(request, 'Unable to delete notifications.');
   if (!context.ok) return context.response;

   let query = context.supabase
      .from('notifications')
      .delete()
      .eq('organization_id', context.organizationId)
      .eq('recipient_id', context.userId);
   if (scope === 'read') query = query.not('read_at', 'is', null);
   const { error } = await query;
   if (error) {
      return NextResponse.json({ error: 'Unable to delete notifications.' }, { status: 500 });
   }
   return new NextResponse(null, { status: 204 });
}
