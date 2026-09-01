import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { updateProjectSchema } from '@/lib/projects/contracts';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function authorizeProjectMutation(request: NextRequest, failureMessage: string) {
   const organizationSlug = request.nextUrl.searchParams.get('organization');
   if (!organizationSlug || !/^[a-z0-9-]{2,48}$/.test(organizationSlug)) {
      return {
         response: NextResponse.json({ error: 'Invalid organization.' }, { status: 400 }),
      };
   }

   const supabase = await createClient();
   const { data: claimsData } = await supabase.auth.getClaims();
   const userId = claimsData?.claims?.sub;
   if (!userId) {
      return { response: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) };
   }

   const { data: organization, error: organizationError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', organizationSlug)
      .maybeSingle();
   if (organizationError) {
      return { response: NextResponse.json({ error: failureMessage }, { status: 500 }) };
   }
   if (!organization) {
      return { response: NextResponse.json({ error: 'Not found.' }, { status: 404 }) };
   }

   const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization.id)
      .eq('user_id', userId)
      .maybeSingle();
   if (membershipError) {
      return { response: NextResponse.json({ error: failureMessage }, { status: 500 }) };
   }
   if (!membership || membership.role === 'guest') {
      return { response: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) };
   }

   return { supabase, organization };
}

export async function PATCH(
   request: NextRequest,
   { params }: { params: Promise<{ projectId: string }> }
) {
   if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
   }
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const { projectId } = await params;
   if (!UUID_PATTERN.test(projectId)) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return NextResponse.json({ error: 'Invalid request body.' }, { status });
   }

   const parsed = updateProjectSchema.safeParse(input);
   if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid project data.' }, { status: 400 });
   }

   const context = await authorizeProjectMutation(request, 'Unable to update project.');
   if ('response' in context) return context.response;
   const { supabase, organization } = context;

   const changes = {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.status !== undefined && { status: parsed.data.status }),
      ...(parsed.data.targetDate !== undefined && { target_date: parsed.data.targetDate }),
   };
   const { data: updated, error } = await supabase
      .from('projects')
      .update(changes)
      .eq('id', projectId)
      .eq('organization_id', organization.id)
      .select('id')
      .maybeSingle();

   if (error) return NextResponse.json({ error: 'Unable to update project.' }, { status: 500 });
   if (!updated) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   return new NextResponse(null, { status: 204 });
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ projectId: string }> }
) {
   if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
   }
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const { projectId } = await params;
   if (!UUID_PATTERN.test(projectId)) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   const context = await authorizeProjectMutation(request, 'Unable to delete project.');
   if ('response' in context) return context.response;
   const { supabase, organization } = context;

   const { error, count } = await supabase
      .from('projects')
      .delete({ count: 'exact' })
      .eq('id', projectId)
      .eq('organization_id', organization.id);

   if (error) return NextResponse.json({ error: 'Unable to delete project.' }, { status: 500 });
   if (!count) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   return new NextResponse(null, { status: 204 });
}
