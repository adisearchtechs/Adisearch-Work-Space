import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { assignReviewerSchema } from '@/lib/reviews/contracts';
import { authorizeReviewAccess, isReviewUuid } from '@/lib/reviews/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export async function POST(request: NextRequest, { params }: { params: Promise<{ reviewId: string }> }) {
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
   const parsed = assignReviewerSchema.safeParse(input);
   if (!parsed.success) return NextResponse.json({ error: 'Invalid reviewer.' }, { status: 400 });

   const context = await authorizeReviewAccess(request, true, 'Unable to assign reviewer.');
   if (!context.ok) return context.response;
   const { data: review } = await context.supabase
      .from('reviews')
      .select('id, created_by')
      .eq('organization_id', context.organizationId)
      .eq('id', reviewId)
      .maybeSingle();
   if (!review) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   if (review.created_by !== context.userId) return NextResponse.json({ error: 'Only the review creator can assign reviewers.' }, { status: 403 });

   const { data: member } = await context.supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', context.organizationId)
      .eq('user_id', parsed.data.userId)
      .maybeSingle();
   if (!member) return NextResponse.json({ error: 'Invalid reviewer.' }, { status: 400 });

   const { error } = await context.supabase.from('review_reviewers').insert({
      review_id: reviewId,
      organization_id: context.organizationId,
      user_id: parsed.data.userId,
      assigned_by: context.userId,
   });
   if (error && error.code !== '23505') return NextResponse.json({ error: 'Unable to assign reviewer.' }, { status: 500 });
   return new NextResponse(null, { status: 204 });
}
