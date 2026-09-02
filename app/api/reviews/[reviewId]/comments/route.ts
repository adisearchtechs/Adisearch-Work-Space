import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { createReviewCommentSchema } from '@/lib/reviews/contracts';
import { authorizeReviewAccess, isReviewUuid } from '@/lib/reviews/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export async function POST(
   request: NextRequest,
   { params }: { params: Promise<{ reviewId: string }> }
) {
   if (!isSupabaseConfigured()) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
   if (!hasValidMutationOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   const { reviewId } = await params;
   if (!isReviewUuid(reviewId)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
   }
   const parsed = createReviewCommentSchema.safeParse(input);
   if (!parsed.success) return NextResponse.json({ error: 'Invalid comment.' }, { status: 400 });

   const context = await authorizeReviewAccess(request, true, 'Unable to add comment.');
   if (!context.ok) return context.response;
   const { data: review, error: reviewError } = await context.supabase
      .from('reviews')
      .select('id')
      .eq('organization_id', context.organizationId)
      .eq('id', reviewId)
      .maybeSingle();
   if (reviewError) return NextResponse.json({ error: 'Unable to add comment.' }, { status: 500 });
   if (!review) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   const { data, error } = await context.supabase
      .from('review_comments')
      .insert({
         organization_id: context.organizationId,
         review_id: reviewId,
         author_id: context.userId,
         body: parsed.data.body,
      })
      .select('id')
      .single();
   if (error || !data) return NextResponse.json({ error: 'Unable to add comment.' }, { status: 500 });
   return NextResponse.json({ id: data.id }, { status: 201 });
}
