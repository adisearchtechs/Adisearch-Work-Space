import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin } from '@/lib/api/security';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { authorizeWorkspaceLabelAccess, isUuid } from '@/lib/workspace-labels/server';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

async function authorizeIssueLabelMutation(
   request: NextRequest,
   params: Promise<{ issueId: string; labelId: string }>
) {
   if (!isSupabaseConfigured()) {
      return { response: unavailable() } as const;
   }
   if (!hasValidMutationOrigin(request)) {
      return { response: NextResponse.json({ error: 'Invalid origin.' }, { status: 403 }) } as const;
   }

   const { issueId, labelId } = await params;
   if (!isUuid(issueId) || !isUuid(labelId)) {
      return { response: NextResponse.json({ error: 'Invalid issue label reference.' }, { status: 400 }) } as const;
   }

   const context = await authorizeWorkspaceLabelAccess(
      request,
      true,
      'Unable to update issue labels.'
   );
   if ('response' in context) return context;

   const [{ data: issue, error: issueError }, { data: label, error: labelError }] =
      await Promise.all([
         context.supabase
            .from('issues')
            .select('id')
            .eq('organization_id', context.organizationId)
            .eq('id', issueId)
            .maybeSingle(),
         context.supabase
            .from('labels')
            .select('id, name, color')
            .eq('organization_id', context.organizationId)
            .eq('id', labelId)
            .maybeSingle(),
      ]);

   if (issueError || labelError) {
      return {
         response: NextResponse.json({ error: 'Unable to update issue labels.' }, { status: 500 }),
      } as const;
   }
   if (!issue || !label) {
      return { response: NextResponse.json({ error: 'Not found.' }, { status: 404 }) } as const;
   }

   return { ...context, issueId, label } as const;
}

export async function POST(
   request: NextRequest,
   { params }: { params: Promise<{ issueId: string; labelId: string }> }
) {
   const context = await authorizeIssueLabelMutation(request, params);
   if ('response' in context) return context.response;

   const { error } = await context.supabase.from('issue_labels').upsert(
      {
         organization_id: context.organizationId,
         issue_id: context.issueId,
         label_id: context.label.id,
      },
      { onConflict: 'issue_id,label_id', ignoreDuplicates: true }
   );
   if (error) {
      return NextResponse.json({ error: 'Unable to add issue label.' }, { status: 500 });
   }

   return NextResponse.json(
      { label: { id: context.label.id, name: context.label.name, color: context.label.color } },
      { status: 200 }
   );
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ issueId: string; labelId: string }> }
) {
   const context = await authorizeIssueLabelMutation(request, params);
   if ('response' in context) return context.response;

   const { error } = await context.supabase
      .from('issue_labels')
      .delete()
      .eq('organization_id', context.organizationId)
      .eq('issue_id', context.issueId)
      .eq('label_id', context.label.id);
   if (error) {
      return NextResponse.json({ error: 'Unable to remove issue label.' }, { status: 500 });
   }

   return new NextResponse(null, { status: 204 });
}