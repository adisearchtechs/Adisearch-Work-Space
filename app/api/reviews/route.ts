import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { createReviewSchema } from '@/lib/reviews/contracts';
import { authorizeReviewAccess, hydrateReviewDtos, REVIEW_SELECT } from '@/lib/reviews/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function GET(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();
   const scope = request.nextUrl.searchParams.get('scope') ?? 'for-you';
   if (scope !== 'for-you' && scope !== 'created') {
      return NextResponse.json({ error: 'Invalid review scope.' }, { status: 400 });
   }

   const context = await authorizeReviewAccess(request, false, 'Unable to load reviews.');
   if (!context.ok) return context.response;

   let query = context.supabase
      .from('reviews')
      .select(REVIEW_SELECT)
      .eq('organization_id', context.organizationId)
      .order('updated_at', { ascending: false });

   if (scope === 'created') {
      query = query.eq('created_by', context.userId);
   } else {
      const { data: assignments, error: assignmentError } = await context.supabase
         .from('review_reviewers')
         .select('review_id')
         .eq('organization_id', context.organizationId)
         .eq('user_id', context.userId);
      if (assignmentError) {
         return NextResponse.json({ error: 'Unable to load reviews.' }, { status: 500 });
      }
      const reviewIds = (assignments ?? []).map((assignment) => assignment.review_id);
      if (reviewIds.length === 0) {
         return NextResponse.json(
            { reviews: [] },
            { headers: { 'Cache-Control': 'private, no-store' } }
         );
      }
      query = query.in('id', reviewIds);
   }

   const { data: rows, error } = await query;
   if (error) return NextResponse.json({ error: 'Unable to load reviews.' }, { status: 500 });

   try {
      const reviews = await hydrateReviewDtos(
         context.supabase,
         context.organizationId,
         rows ?? [],
         context.userId
      );
      return NextResponse.json(
         { reviews },
         { headers: { 'Cache-Control': 'private, no-store' } }
      );
   } catch {
      return NextResponse.json({ error: 'Unable to load reviews.' }, { status: 500 });
   }
}

export async function POST(request: NextRequest) {
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
   const parsed = createReviewSchema.safeParse(input);
   if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid review data.' }, { status: 400 });
   }

   const context = await authorizeReviewAccess(request, true, 'Unable to create review.');
   if (!context.ok) return context.response;

   if (parsed.data.issueId) {
      const { data: issue, error: issueError } = await context.supabase
         .from('issues')
         .select('id')
         .eq('organization_id', context.organizationId)
         .eq('id', parsed.data.issueId)
         .maybeSingle();
      if (issueError) return NextResponse.json({ error: 'Unable to create review.' }, { status: 500 });
      if (!issue) return NextResponse.json({ error: 'Invalid issue.' }, { status: 400 });
   }

   const externalUrl = parsed.data.externalUrl || null;
   let externalProvider: 'github' | null = null;
   if (externalUrl) {
      try {
         externalProvider = new URL(externalUrl).hostname.toLowerCase() === 'github.com' ? 'github' : null;
      } catch {
         return NextResponse.json({ error: 'Invalid external URL.' }, { status: 400 });
      }
   }

   const { data: row, error } = await context.supabase
      .from('reviews')
      .insert({
         organization_id: context.organizationId,
         created_by: context.userId,
         issue_id: parsed.data.issueId ?? null,
         title: parsed.data.title,
         body: parsed.data.body,
         external_provider: externalProvider,
         external_url: externalUrl,
         repository: parsed.data.repository || null,
         external_number: parsed.data.externalNumber ?? null,
         target_ref: parsed.data.targetRef,
         source_ref: parsed.data.sourceRef,
         test_plan: parsed.data.testPlan,
         checks_passed: parsed.data.checksPassed,
         checks_total: parsed.data.checksTotal,
      })
      .select(REVIEW_SELECT)
      .single();
   if (error || !row) {
      return NextResponse.json({ error: 'Unable to create review.' }, { status: 500 });
   }

   try {
      const [review] = await hydrateReviewDtos(
         context.supabase,
         context.organizationId,
         [row],
         context.userId
      );
      return NextResponse.json({ review }, { status: 201 });
   } catch {
      return NextResponse.json({ error: 'Unable to create review.' }, { status: 500 });
   }
}
