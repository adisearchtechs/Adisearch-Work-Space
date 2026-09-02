import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { updateReviewerVerdictSchema } from '@/lib/reviews/contracts';
import { authorizeReviewAccess, isReviewUuid } from '@/lib/reviews/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export async function PATCH(
   request: NextRequest,
   { params }: { params: Promise<{ reviewId: string; userId: string }> }
) {
   if (!isSupabaseConfigured()) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
   if (!hasValidMutationOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   const { reviewId, userId } = await params;
   if (!isReviewUuid(reviewId) || !isReviewUuid(userId)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
   }
   const parsed = updateReviewerVerdictSchema.safeParse(input);
   if (!parsed.success) return NextResponse.json({ error: 'Invalid verdict.' }, { status: 400 });

   const context = await authorizeReviewAccess(request, false, 'Unable to update review verdict.');
   if (!context.ok) return context.response;
   if (userId !== context.userId) return NextResponse.json({ error: 'You can only update your own verdict.' }, { status: 403 });

   const { data, error } = await context.supabase
      .from('review_reviewers')
      .update({ verdict: parsed.data.verdict, responded_at: new Date().toISOString() })
      .eq('review_id', reviewId)
      .eq('organization_id', context.organizationId)
      .eq('user_id', context.userId)
      .select('review_id')
      .maybeSingle();
   if (error) return NextResponse.json({ error: 'Unable to update review verdict.' }, { status: 500 });
   if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   return new NextResponse(null, { status: 204 });
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ reviewId: string; userId: string }> }
) {
   if (!isSupabaseConfigured()) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
   if (!hasValidMutationOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   const { reviewId, userId } = await params;
   if (!isReviewUuid(reviewId) || !isReviewUuid(userId)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   const context = await authorizeReviewAccess(request, true, 'Unable to remove reviewer.');
   if (!context.ok) return context.response;
   const { data: review } = await context.supabase
      .from('reviews')
      .select('created_by')
      .eq('organization_id', context.organizationId)
      .eq('id', reviewId)
      .maybeSingle();
   if (!review) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   if (review.created_by !== context.userId) return NextResponse.json({ error: 'Only the review creator can remove reviewers.' }, { status: 403 });

   const { error } = await context.supabase
      .from('review_reviewers')
      .delete()
      .eq('review_id', reviewId)
      .eq('organization_id', context.organizationId)
      .eq('user_id', userId);
   if (error) return NextResponse.json({ error: 'Unable to remove reviewer.' }, { status: 500 });
   return new NextResponse(null, { status: 204 });
}
