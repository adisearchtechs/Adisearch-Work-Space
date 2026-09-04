import { NextResponse, type NextRequest } from 'next/server';
import type { StatusReportSnapshotDto, StatusReportSnapshotPayload } from '@/lib/status-report-snapshots/contracts';
import type { Json } from '@/lib/supabase/database.types';
import { authorizeWorkspaceMemberAccess, isUuid } from '@/lib/workspace-members/server';

type SnapshotRow = {
   id: string;
   scope: 'workspace' | 'team';
   team_id: string | null;
   created_by: string;
   schema_version: number;
   generated_at: string;
   created_at: string;
   payload: Json;
};

function toDto(row: SnapshotRow): StatusReportSnapshotDto {
   return {
      id: row.id,
      scope: row.scope,
      teamId: row.team_id,
      createdBy: row.created_by,
      schemaVersion: 1,
      generatedAt: row.generated_at,
      createdAt: row.created_at,
      payload: row.payload as unknown as StatusReportSnapshotPayload,
   };
}

export async function GET(
   request: NextRequest,
   { params }: { params: Promise<{ snapshotId: string }> }
) {
   const { snapshotId } = await params;
   if (!isUuid(snapshotId)) {
      return NextResponse.json({ error: 'Invalid snapshot.' }, { status: 400 });
   }

   const context = await authorizeWorkspaceMemberAccess(
      request,
      false,
      'Unable to load status report snapshot.'
   );
   if ('response' in context) return context.response;

   const { data, error } = await context.supabase
      .from('status_report_snapshots')
      .select('id, scope, team_id, created_by, schema_version, generated_at, created_at, payload')
      .eq('organization_id', context.organizationId)
      .eq('id', snapshotId)
      .maybeSingle();

   if (error) {
      return NextResponse.json({ error: 'Unable to load status report snapshot.' }, { status: 500 });
   }
   if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   const snapshot = data as SnapshotRow;
   let previousQuery = context.supabase
      .from('status_report_snapshots')
      .select('id, scope, team_id, created_by, schema_version, generated_at, created_at, payload')
      .eq('organization_id', context.organizationId)
      .eq('scope', snapshot.scope)
      .lt('created_at', snapshot.created_at)
      .order('created_at', { ascending: false })
      .limit(1);

   previousQuery = snapshot.team_id
      ? previousQuery.eq('team_id', snapshot.team_id)
      : previousQuery.is('team_id', null);

   const { data: previousRows, error: previousError } = await previousQuery;
   if (previousError) {
      return NextResponse.json({ error: 'Unable to load status report snapshot.' }, { status: 500 });
   }

   const previous = ((previousRows ?? [])[0] as SnapshotRow | undefined) ?? null;

   return NextResponse.json(
      {
         snapshot: toDto(snapshot),
         previous: previous ? toDto(previous) : null,
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}
