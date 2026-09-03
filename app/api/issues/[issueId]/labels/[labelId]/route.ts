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
      return { ok: false, response: unavailable() } as const;
   }
   if (!hasValidMutationOrigin(request)) {
      return {
         ok: false,
         response: NextResponse.json({ error: 'Invalid origin.' }, { status: 403 }),
      } as const;
   }

   const { issueId, labelId } = await params;
   if (!isUuid(issueId) || !isUuid(labelId)) {
      return {
         ok: false,
         response: NextResponse.json({ error: 'Invalid issue label reference.' }, { status: 400 }),
      } as const;
   }

   const workspace = await authorizeWorkspaceLabelAccess(
      request,
      true,
      'Unable to update issue labels.'
   );
   if ('response' in workspace) {
      return { ok: false, response: workspace.response } as const;
   }

   const [{ data: issue, error: issueError }, { data: label, error: labelError }] =
      await Promise.all([
         workspace.supabase
            .from('issues')
            .select('id')
            .eq('organization_id', workspace.organizationId)
            .eq('id', issueId)
            .maybeSingle(),
         workspace.supabase
            .from('labels')
            .select('id, name, color')
            .eq('organization_id', workspace.organizationId)
            .eq('id', labelId)
            .maybeSingle(),
      ]);

   if (issueError || labelError) {
      return {
         ok: false,
         response: NextResponse.json({ error: 'Unable to update issue labels.' }, { status: 500 }),
      } as const;
   }
   if (!issue || !label) {
      return {
         ok: false,
         response: NextResponse.json({ error: 'Not found.' }, { status: 404 }),
      } as const;
   }

   return { ok: true, workspace, issueId, label } as const;
}

export async function POST(
   request: NextRequest,
   { params }: { params: Promise<{ issueId: string; labelId: string }> }
) {
   const authorized = await authorizeIssueLabelMutation(request, params);
   if (!authorized.ok) return authorized.response;

   const { workspace, issueId, label } = authorized;
   const { error } = await workspace.supabase.from('issue_labels').upsert(
      {
         organization_id: workspace.organizationId,
         issue_id: issueId,
         label_id: label.id,
      },
      { onConflict: 'issue_id,label_id', ignoreDuplicates: true }
   );
   if (error) {
      return NextResponse.json({ error: 'Unable to add issue label.' }, { status: 500 });
   }

   return NextResponse.json(
      { label: { id: label.id, name: label.name, color: label.color } },
      { status: 200 }
   );
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ issueId: string; labelId: string }> }
) {
   const authorized = await authorizeIssueLabelMutation(request, params);
   if (!authorized.ok) return authorized.response;

   const { workspace, issueId, label } = authorized;
   const { error } = await workspace.supabase
      .from('issue_labels')
      .delete()
      .eq('organization_id', workspace.organizationId)
      .eq('issue_id', issueId)
      .eq('label_id', label.id);
   if (error) {
      return NextResponse.json({ error: 'Unable to remove issue label.' }, { status: 500 });
   }

   return new NextResponse(null, { status: 204 });
}