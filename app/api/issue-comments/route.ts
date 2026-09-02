import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin } from '@/lib/api/security';
import {
   isIssueCommentUuid,
   parseIssueCommentBody,
   type IssueCommentDto,
} from '@/lib/issue-comments/contracts';
import { authorizeIssueCommentAccess, issueExists } from '@/lib/issue-comments/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

type CommentRow = {
   id: string;
   author_id: string | null;
   body: string;
   created_at: string;
};

type ProfileRow = {
   id: string;
   display_name: string | null;
   avatar_url: string | null;
};

function toDto(row: CommentRow, profiles: ReadonlyMap<string, ProfileRow>): IssueCommentDto {
   const profile = row.author_id ? profiles.get(row.author_id) : undefined;
   return {
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      author: {
         id: row.author_id,
         displayName: profile?.display_name || (row.author_id ? 'Workspace member' : 'Former member'),
         avatarUrl: profile?.avatar_url ?? null,
      },
   };
}

async function loadProfiles(
   context: Awaited<ReturnType<typeof authorizeIssueCommentAccess>> & { ok: true },
   authorIds: string[]
) {
   const uniqueIds = [...new Set(authorIds)];
   if (uniqueIds.length === 0) return new Map<string, ProfileRow>();
   const { data, error } = await context.supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', uniqueIds);
   if (error) return null;
   return new Map((data ?? []).map((profile) => [profile.id, profile]));
}

export async function GET(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();
   const issueId = request.nextUrl.searchParams.get('issueId') ?? '';
   if (!isIssueCommentUuid(issueId)) {
      return NextResponse.json({ error: 'Invalid issue.' }, { status: 400 });
   }

   const context = await authorizeIssueCommentAccess(request, false);
   if (!context.ok) return context.response;
   if (!(await issueExists(context, issueId))) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   const { data, error } = await context.supabase
      .from('issue_comments')
      .select('id, author_id, body, created_at')
      .eq('organization_id', context.organizationId)
      .eq('issue_id', issueId)
      .order('created_at', { ascending: true })
      .limit(500);
   if (error) {
      return NextResponse.json({ error: 'Unable to load issue comments.' }, { status: 500 });
   }

   const rows = (data ?? []) as CommentRow[];
   const profiles = await loadProfiles(
      context,
      rows.flatMap((row) => (row.author_id ? [row.author_id] : []))
   );
   if (!profiles) {
      return NextResponse.json({ error: 'Unable to load comment authors.' }, { status: 500 });
   }

   return NextResponse.json(
      {
         comments: rows.map((row) => toDto(row, profiles)),
         canWrite: context.role !== 'guest',
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}

export async function POST(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const context = await authorizeIssueCommentAccess(request, true);
   if (!context.ok) return context.response;
   const value = await request.json().catch(() => null);
   const body = parseIssueCommentBody(value);
   if (!body) {
      return NextResponse.json({ error: 'Invalid comment.' }, { status: 400 });
   }
   if (!(await issueExists(context, body.issueId))) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   const { data, error } = await context.supabase
      .from('issue_comments')
      .insert({
         organization_id: context.organizationId,
         issue_id: body.issueId,
         author_id: context.userId,
         body: body.body,
      })
      .select('id, author_id, body, created_at')
      .single();
   if (error) {
      return NextResponse.json({ error: 'Unable to save comment.' }, { status: 500 });
   }

   const profiles = await loadProfiles(context, [context.userId]);
   if (!profiles) {
      return NextResponse.json({ error: 'Unable to load comment author.' }, { status: 500 });
   }

   return NextResponse.json({ comment: toDto(data as CommentRow, profiles) }, { status: 201 });
}
