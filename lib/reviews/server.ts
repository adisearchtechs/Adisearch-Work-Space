import { NextResponse, type NextRequest } from 'next/server';
import type { ReviewDto, ReviewMemberDto } from '@/lib/reviews/contracts';
import { createClient } from '@/lib/supabase/server';

const ORGANIZATION_SLUG = /^[a-z0-9-]{2,48}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isReviewUuid(value: string) {
   return UUID.test(value);
}

export async function authorizeReviewAccess(
   request: NextRequest,
   requireWrite: boolean,
   failureMessage: string
) {
   const organizationSlug = request.nextUrl.searchParams.get('organization');
   if (!organizationSlug || !ORGANIZATION_SLUG.test(organizationSlug)) {
      return {
         ok: false as const,
         response: NextResponse.json({ error: 'Invalid organization.' }, { status: 400 }),
      };
   }

   const supabase = await createClient();
   const { data: claimsData } = await supabase.auth.getClaims();
   const userId = claimsData?.claims?.sub ?? null;
   if (!userId) {
      return {
         ok: false as const,
         response: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }),
      };
   }

   const { data: organization, error: organizationError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', organizationSlug)
      .maybeSingle();
   if (organizationError) {
      return {
         ok: false as const,
         response: NextResponse.json({ error: failureMessage }, { status: 500 }),
      };
   }
   if (!organization) {
      return {
         ok: false as const,
         response: NextResponse.json({ error: 'Not found.' }, { status: 404 }),
      };
   }

   const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization.id)
      .eq('user_id', userId)
      .maybeSingle();
   if (membershipError) {
      return {
         ok: false as const,
         response: NextResponse.json({ error: failureMessage }, { status: 500 }),
      };
   }
   if (!membership) {
      return {
         ok: false as const,
         response: NextResponse.json({ error: 'Not found.' }, { status: 404 }),
      };
   }
   if (requireWrite && membership.role === 'guest') {
      return {
         ok: false as const,
         response: NextResponse.json({ error: 'Read-only workspace access.' }, { status: 403 }),
      };
   }

   return {
      ok: true as const,
      supabase,
      userId,
      role: membership.role,
      organizationId: organization.id,
      organizationSlug,
   };
}

type ReviewRow = {
   id: string;
   title: string;
   body: string;
   status: string;
   created_by: string;
   issue_id: string | null;
   external_provider: string | null;
   external_url: string | null;
   repository: string | null;
   external_number: number | null;
   target_ref: string;
   source_ref: string;
   test_plan: string;
   checks_passed: number;
   checks_total: number;
   created_at: string;
   updated_at: string;
};

type ReviewClient = Awaited<ReturnType<typeof createClient>>;

export async function hydrateReviewDtos(
   supabase: ReviewClient,
   organizationId: string,
   rows: ReviewRow[],
   viewerId: string
): Promise<ReviewDto[]> {
   if (rows.length === 0) return [];

   const reviewIds = rows.map((row) => row.id);
   const issueIds = [...new Set(rows.flatMap((row) => (row.issue_id ? [row.issue_id] : [])))];
   const [reviewersResult, commentsResult, issuesResult] = await Promise.all([
      supabase
         .from('review_reviewers')
         .select('review_id, user_id, verdict, assigned_at, responded_at')
         .eq('organization_id', organizationId)
         .in('review_id', reviewIds),
      supabase
         .from('review_comments')
         .select('id, review_id, author_id, body, created_at, updated_at')
         .eq('organization_id', organizationId)
         .in('review_id', reviewIds)
         .order('created_at'),
      issueIds.length
         ? supabase
              .from('issues')
              .select('id, issue_number, title, team_id')
              .eq('organization_id', organizationId)
              .in('id', issueIds)
         : Promise.resolve({ data: [], error: null }),
   ]);

   const error = reviewersResult.error ?? commentsResult.error ?? issuesResult.error;
   if (error) throw error;

   const teamIds = [
      ...new Set((issuesResult.data ?? []).map((issue) => issue.team_id).filter(Boolean)),
   ];
   const teamsResult = teamIds.length
      ? await supabase
           .from('teams')
           .select('id, issue_prefix')
           .eq('organization_id', organizationId)
           .in('id', teamIds)
      : { data: [], error: null };
   if (teamsResult.error) throw teamsResult.error;

   const profileIds = [
      ...new Set([
         ...rows.map((row) => row.created_by),
         ...(reviewersResult.data ?? []).map((row) => row.user_id),
         ...(commentsResult.data ?? []).flatMap((row) => (row.author_id ? [row.author_id] : [])),
      ]),
   ];
   const profilesResult = profileIds.length
      ? await supabase.from('profiles').select('id, display_name, avatar_url').in('id', profileIds)
      : { data: [], error: null };
   if (profilesResult.error) throw profilesResult.error;

   const profileById = new Map(
      (profilesResult.data ?? []).map((profile) => [
         profile.id,
         {
            id: profile.id,
            displayName: profile.display_name || 'Workspace member',
            avatarUrl: profile.avatar_url ?? null,
         } satisfies ReviewMemberDto,
      ])
   );
   const teamPrefixById = new Map(
      (teamsResult.data ?? []).map((team) => [team.id, team.issue_prefix])
   );
   const issueById = new Map(
      (issuesResult.data ?? []).map((issue) => [
         issue.id,
         {
            id: issue.id,
            identifier: `${teamPrefixById.get(issue.team_id) ?? 'ISS'}-${issue.issue_number}`,
            title: issue.title,
         },
      ])
   );

   return rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      status: row.status as ReviewDto['status'],
      createdBy:
         profileById.get(row.created_by) ??
         ({ id: row.created_by, displayName: 'Workspace member', avatarUrl: null } satisfies ReviewMemberDto),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      issue: row.issue_id ? issueById.get(row.issue_id) ?? null : null,
      externalProvider: row.external_provider === 'github' ? 'github' : null,
      externalUrl: row.external_url,
      repository: row.repository,
      externalNumber: row.external_number,
      targetRef: row.target_ref,
      sourceRef: row.source_ref,
      testPlan: row.test_plan,
      checksPassed: row.checks_passed,
      checksTotal: row.checks_total,
      reviewers: (reviewersResult.data ?? [])
         .filter((reviewer) => reviewer.review_id === row.id)
         .map((reviewer) => ({
            user:
               profileById.get(reviewer.user_id) ??
               ({ id: reviewer.user_id, displayName: 'Workspace member', avatarUrl: null } satisfies ReviewMemberDto),
            verdict: reviewer.verdict as ReviewDto['reviewers'][number]['verdict'],
            assignedAt: reviewer.assigned_at,
            respondedAt: reviewer.responded_at,
         })),
      comments: (commentsResult.data ?? [])
         .filter((comment) => comment.review_id === row.id)
         .map((comment) => ({
            id: comment.id,
            body: comment.body,
            createdAt: comment.created_at,
            updatedAt: comment.updated_at,
            author: comment.author_id ? profileById.get(comment.author_id) ?? null : null,
         })),
      canEdit: row.created_by === viewerId,
   }));
}

export const REVIEW_SELECT =
   'id, title, body, status, created_by, issue_id, external_provider, external_url, repository, external_number, target_ref, source_ref, test_plan, checks_passed, checks_total, created_at, updated_at';
