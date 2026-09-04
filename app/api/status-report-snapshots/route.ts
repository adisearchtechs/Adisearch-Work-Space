import { NextResponse, type NextRequest } from 'next/server';
import { GET as getWorkspaceDashboard } from '@/app/api/dashboard/route';
import { GET as getWorkspaceDependencies } from '@/app/api/dependencies/route';
import { GET as getTeamDashboard } from '@/app/api/teams/[teamId]/dashboard/route';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import type { Json } from '@/lib/supabase/database.types';
import {
   createStatusReportSnapshotSchema,
   type StatusReportSnapshotDto,
   type StatusReportSnapshotPayload,
   type TeamStatusReportSnapshotPayload,
   type WorkspaceStatusReportSnapshotPayload,
} from '@/lib/status-report-snapshots/contracts';
import type { TeamDashboardResponse } from '@/lib/team-dashboard/contracts';
import type { WorkspaceDashboardResponse } from '@/lib/workspace-dashboard/contracts';
import type { WorkspaceDependenciesResponse } from '@/lib/workspace-dependencies/contracts';
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

function maxTimestamp(left: string, right: string) {
   return left > right ? left : right;
}

async function readResponse<T>(
   response: Response | undefined,
   failureMessage: string
): Promise<T> {
   if (!response) throw new Error(`${failureMessage}:500`);
   if (!response.ok) throw new Error(`${failureMessage}:${response.status}`);
   return (await response.json()) as T;
}

function routeFailure(error: unknown) {
   if (error instanceof Error) {
      const match = error.message.match(/:(\d{3})$/);
      if (match) {
         const status = Number(match[1]);
         if (status >= 400 && status < 500) {
            return NextResponse.json({ error: 'Unable to capture status report.' }, { status });
         }
      }
   }
   return NextResponse.json({ error: 'Unable to capture status report.' }, { status: 500 });
}

export async function GET(request: NextRequest) {
   const context = await authorizeWorkspaceMemberAccess(
      request,
      false,
      'Unable to load status report history.'
   );
   if ('response' in context) return context.response;

   const rawScope = request.nextUrl.searchParams.get('scope');
   let scope: 'workspace' | 'team' | null = null;
   if (rawScope === 'workspace' || rawScope === 'team') {
      scope = rawScope;
   } else if (rawScope) {
      return NextResponse.json({ error: 'Invalid snapshot scope.' }, { status: 400 });
   }

   const teamId = request.nextUrl.searchParams.get('teamId');
   const rawLimit = Number(request.nextUrl.searchParams.get('limit') ?? '50');
   const limit = Number.isFinite(rawLimit) ? Math.min(50, Math.max(1, Math.floor(rawLimit))) : 50;

   if (teamId && !isUuid(teamId)) {
      return NextResponse.json({ error: 'Invalid team.' }, { status: 400 });
   }

   let query = context.supabase
      .from('status_report_snapshots')
      .select('id, scope, team_id, created_by, schema_version, generated_at, created_at, payload')
      .eq('organization_id', context.organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

   if (scope) query = query.eq('scope', scope);
   if (teamId) query = query.eq('team_id', teamId);

   const { data, error } = await query;
   if (error) {
      return NextResponse.json({ error: 'Unable to load status report history.' }, { status: 500 });
   }

   return NextResponse.json(
      { snapshots: ((data ?? []) as SnapshotRow[]).map(toDto) },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}

export async function POST(request: NextRequest) {
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const context = await authorizeWorkspaceMemberAccess(
      request,
      false,
      'Unable to capture status report.'
   );
   if ('response' in context) return context.response;
   if (context.role === 'guest') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
   }

   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return NextResponse.json({ error: 'Invalid request body.' }, { status });
   }

   const parsed = createStatusReportSnapshotSchema.safeParse(input);
   if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid status snapshot request.' }, { status: 400 });
   }

   let payload: StatusReportSnapshotPayload;
   let generatedAt: string;
   const teamId = parsed.data.scope === 'team' ? parsed.data.teamId! : null;

   try {
      if (parsed.data.scope === 'workspace') {
         const [dashboardResponse, dependenciesResponse] = await Promise.all([
            getWorkspaceDashboard(request),
            getWorkspaceDependencies(request),
         ]);
         const [dashboard, dependencies] = await Promise.all([
            readResponse<WorkspaceDashboardResponse>(dashboardResponse, 'dashboard'),
            readResponse<WorkspaceDependenciesResponse>(dependenciesResponse, 'dependencies'),
         ]);
         generatedAt = maxTimestamp(dashboard.generatedAt, dependencies.generatedAt);
         payload = {
            kind: 'workspace',
            schemaVersion: 1,
            dashboard,
            dependencies,
         } satisfies WorkspaceStatusReportSnapshotPayload;
      } else {
         const [dashboardResponse, dependenciesResponse] = await Promise.all([
            getTeamDashboard(request, { params: Promise.resolve({ teamId: teamId! }) }),
            getWorkspaceDependencies(request),
         ]);
         const [dashboard, dependencies] = await Promise.all([
            readResponse<TeamDashboardResponse>(dashboardResponse, 'team-dashboard'),
            readResponse<WorkspaceDependenciesResponse>(dependenciesResponse, 'dependencies'),
         ]);
         generatedAt = maxTimestamp(dashboard.generatedAt, dependencies.generatedAt);
         payload = {
            kind: 'team',
            schemaVersion: 1,
            teamId: teamId!,
            dashboard,
            dependencies,
         } satisfies TeamStatusReportSnapshotPayload;
      }
   } catch (error) {
      return routeFailure(error);
   }

   const { data, error } = await context.supabase
      .from('status_report_snapshots')
      .insert({
         organization_id: context.organizationId,
         scope: parsed.data.scope,
         team_id: teamId,
         created_by: context.userId,
         schema_version: 1,
         generated_at: generatedAt,
         payload: payload as unknown as Json,
      })
      .select('id, scope, team_id, created_by, schema_version, generated_at, created_at, payload')
      .single();

   if (error || !data) {
      return NextResponse.json({ error: 'Unable to save status report snapshot.' }, { status: 500 });
   }

   return NextResponse.json({ snapshot: toDto(data as SnapshotRow) }, { status: 201 });
}
