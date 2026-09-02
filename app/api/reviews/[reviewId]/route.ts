import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { updateReviewSchema } from '@/lib/reviews/contracts';
import {
   authorizeReviewAccess,
   hydrateReviewDtos,
   isReviewUuid,
   REVIEW_SELECT,
} from '@/lib/reviews/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function GET(
   request: NextRequest,
   { params }: { params: Promise<{ reviewId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   const { reviewId } = await params;
   if (!isReviewUuid(reviewId)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   const context = await authorizeReviewAccess(request, false, 'Unable to load review.');
   if (!context.ok) return context.response;
   const { data: row, error } = await context.supabase
      .from('reviews')
      .select(REVIEW_SELECT)
      .eq('organization_id', context.organizationId)
      .eq('id', reviewId)
      .maybeSingle();
   if (error) return NextResponse.json({ error: 'Unable to load review.' }, { status: 500 });
   if (!row) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   try {
      const [review] = await hydrateReviewDtos(
         context.supabase,
         context.organizationId,
         [row],
         context.userId
      );
      return NextResponse.json(
         { review },
         { headers: { 'Cache-Control': 'private, no-store' } }
      );
   } catch {
      return NextResponse.json({ error: 'Unable to load review.' }, { status: 500 });
   }
}

export async function PATCH(
   request: NextRequest,
   { params }: { params: Promise<{ reviewId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }
   const { reviewId } = await params;
   if (!isReviewUuid(reviewId)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return NextResponse.json({ error: 'Invalid request body.' }, { status });
   }
   const parsed = updateReviewSchema.safeParse(input);
   if (!parsed.success) return NextResponse.json({ error: 'Invalid review update.' }, { status: 400 });

   const context = await authorizeReviewAccess(request, true, 'Unable to update review.');
   if (!context.ok) return context.response;
   const { data: existing, error: existingError } = await context.supabase
      .from('reviews')
      .select('id, created_by, checks_passed, checks_total')
      .eq('organization_id', context.organizationId)
      .eq('id', reviewId)
      .maybeSingle();
   if (existingError) return NextResponse.json({ error: 'Unable to update review.' }, { status: 500 });
   if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   if (existing.created_by !== context.userId) {
      return NextResponse.json({ error: 'Only the review creator can edit this review.' }, { status: 403 });
   }

   if (parsed.data.issueId) {
      const { data: issue, error: issueError } = await context.supabase
         .from('issues')
         .select('id')
         .eq('organization_id', context.organizationId)
         .eq('id', parsed.data.issueId)
         .maybeSingle();
      if (issueError) return NextResponse.json({ error: 'Unable to update review.' }, { status: 500 });
      if (!issue) return NextResponse.json({ error: 'Invalid issue.' }, { status: 400 });
   }

   const nextPassed = parsed.data.checksPassed ?? existing.checks_passed;
   const nextTotal = parsed.data.checksTotal ?? existing.checks_total;
   if (nextPassed > nextTotal) {
      return NextResponse.json({ error: 'Passed checks cannot exceed total checks.' }, { status: 400 });
   }

   let externalProvider: 'github' | null | undefined;
   let externalUrl: string | null | undefined;
   if (parsed.data.externalUrl !== undefined) {
      externalUrl = parsed.data.externalUrl || null;
      if (externalUrl) {
         try {
            externalProvider = new URL(externalUrl).hostname.toLowerCase() === 'github.com' ? 'github' : null;
         } catch {
            return NextResponse.json({ error: 'Invalid external URL.' }, { status: 400 });
         }
      } else {
         externalProvider = null;
      }
   }

   const changes = {
      ...(parsed.data.title !== undefined && { title: parsed.data.title }),
      ...(parsed.data.body !== undefined && { body: parsed.data.body }),
      ...(parsed.data.status !== undefined && { status: parsed.data.status }),
      ...(parsed.data.issueId !== undefined && { issue_id: parsed.data.issueId }),
      ...(externalUrl !== undefined && { external_url: externalUrl }),
      ...(externalProvider !== undefined && { external_provider: externalProvider }),
      ...(parsed.data.repository !== undefined && { repository: parsed.data.repository || null }),
      ...(parsed.data.externalNumber !== undefined && { external_number: parsed.data.externalNumber }),
      ...(parsed.data.targetRef !== undefined && { target_ref: parsed.data.targetRef }),
      ...(parsed.data.sourceRef !== undefined && { source_ref: parsed.data.sourceRef }),
      ...(parsed.data.testPlan !== undefined && { test_plan: parsed.data.testPlan }),
      ...(parsed.data.checksPassed !== undefined && { checks_passed: parsed.data.checksPassed }),
      ...(parsed.data.checksTotal !== undefined && { checks_total: parsed.data.checksTotal }),
   };

   const { data: row, error } = await context.supabase
      .from('reviews')
      .update(changes)
      .eq('organization_id', context.organizationId)
      .eq('id', reviewId)
      .eq('created_by', context.userId)
      .select(REVIEW_SELECT)
      .maybeSingle();
   if (error) return NextResponse.json({ error: 'Unable to update review.' }, { status: 500 });
   if (!row) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   try {
      const [review] = await hydrateReviewDtos(
         context.supabase,
         context.organizationId,
         [row],
         context.userId
      );
      return NextResponse.json({ review });
   } catch {
      return NextResponse.json({ error: 'Unable to update review.' }, { status: 500 });
   }
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ reviewId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }
   const { reviewId } = await params;
   if (!isReviewUuid(reviewId)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   const context = await authorizeReviewAccess(request, true, 'Unable to delete review.');
   if (!context.ok) return context.response;
   const { data, error } = await context.supabase
      .from('reviews')
      .delete()
      .eq('organization_id', context.organizationId)
      .eq('id', reviewId)
      .eq('created_by', context.userId)
      .select('id')
      .maybeSingle();
   if (error) return NextResponse.json({ error: 'Unable to delete review.' }, { status: 500 });
   if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   return new NextResponse(null, { status: 204 });
}
