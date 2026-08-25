import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { updateIssueSchema } from '@/lib/issues/contracts';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getAuthenticatedClient() {
   const supabase = await createClient();
   const { data: claimsData } = await supabase.auth.getClaims();
   const claims = claimsData?.claims;
   return { supabase, userId: claims?.sub ?? null };
}

export async function PATCH(
   request: NextRequest,
   { params }: { params: Promise<{ issueId: string }> }
) {
   if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
   }
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const { issueId } = await params;
   if (!UUID_PATTERN.test(issueId)) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return NextResponse.json({ error: 'Invalid request body.' }, { status });
   }

   const parsed = updateIssueSchema.safeParse(input);
   if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid issue data.' }, { status: 400 });
   }

   const { supabase, userId } = await getAuthenticatedClient();
   if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

   const { data: existing } = await supabase
      .from('issues')
      .select('id, organization_id')
      .eq('id', issueId)
      .maybeSingle();
   if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   let statusId: string | undefined;
   if (parsed.data.statusSlug) {
      const { data: nextStatus } = await supabase
         .from('statuses')
         .select('id')
         .eq('organization_id', existing.organization_id)
         .eq('slug', parsed.data.statusSlug)
         .maybeSingle();
      if (!nextStatus) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
      statusId = nextStatus.id;
   }

   const changes = {
      ...(parsed.data.title !== undefined && { title: parsed.data.title }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description }),
      ...(parsed.data.priority !== undefined && { priority: parsed.data.priority }),
      ...(parsed.data.dueDate !== undefined && { due_date: parsed.data.dueDate }),
      ...(statusId !== undefined && { status_id: statusId }),
   };
   const { error } = await supabase.from('issues').update(changes).eq('id', issueId);
   if (error) return NextResponse.json({ error: 'Unable to update issue.' }, { status: 500 });

   return new NextResponse(null, { status: 204 });
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ issueId: string }> }
) {
   if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
   }
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const { issueId } = await params;
   if (!UUID_PATTERN.test(issueId)) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   const { supabase, userId } = await getAuthenticatedClient();
   if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

   const { error, count } = await supabase
      .from('issues')
      .delete({ count: 'exact' })
      .eq('id', issueId);
   if (error) return NextResponse.json({ error: 'Unable to delete issue.' }, { status: 500 });
   if (!count) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   return new NextResponse(null, { status: 204 });
}
