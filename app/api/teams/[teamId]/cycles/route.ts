import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import {
   createCycleSchema,
   type CycleDto,
   type CycleIssueDto,
   type CycleIssueStatusCategory,
   type CyclesCollectionResponse,
} from '@/lib/cycles/contracts';
import { authorizeCycleAccess, cycleStatusForDates } from '@/lib/cycles/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

type CycleRow = {
   id: string;
   team_id: string;
   name: string;
   starts_at: string;
   ends_at: string;
   created_at: string;
   updated_at: string;
};

type IssueRow = {
   id: string;
   issue_number: number;
   title: string;
   status_id: string;
   cycle_id: string | null;
};

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

function issueDto(
   row: IssueRow,
   prefix: string,
   categoryByStatusId: Map<string, CycleIssueStatusCategory>
): CycleIssueDto {
   return {
      id: row.id,
      identifier: `${prefix}-${row.issue_number}`,
      title: row.title,
      statusCategory: categoryByStatusId.get(row.status_id) ?? 'unstarted',
   };
}

function cycleDto(row: CycleRow, issues: CycleIssueDto[]): CycleDto {
   const completed = issues.filter((issue) => issue.statusCategory === 'completed').length;
   const started = issues.filter((issue) => issue.statusCategory === 'started').length;
   const canceled = issues.filter((issue) => issue.statusCategory === 'canceled').length;
   const countableScope = Math.max(0, issues.length - canceled);
   return {
      id: row.id,
      name: row.name,
      teamId: row.team_id,
      startDate: row.starts_at,
      endDate: row.ends_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      status: cycleStatusForDates(row.starts_at, row.ends_at),
      scope: issues.length,
      started,
      completed,
      canceled,
      successRate: countableScope === 0 ? 0 : Math.round((completed / countableScope) * 100),
      issues,
   };
}

export async function GET(
   request: NextRequest,
   { params }: { params: Promise<{ teamId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   const { teamId } = await params;
   const context = await authorizeCycleAccess(request, teamId, false, 'Unable to load cycles.');
   if (!context.ok) return context.response;

   const [
      { data: cycles, error: cyclesError },
      { data: statuses, error: statusesError },
      { data: issues, error: issuesError },
   ] = await Promise.all([
      context.supabase
         .from('cycles')
         .select('id, team_id, name, starts_at, ends_at, created_at, updated_at')
         .eq('organization_id', context.organizationId)
         .eq('team_id', context.team.id)
         .order('starts_at', { ascending: false })
         .limit(200),
      context.supabase
         .from('statuses')
         .select('id, category')
         .eq('organization_id', context.organizationId),
      context.supabase
         .from('issues')
         .select('id, issue_number, title, status_id, cycle_id')
         .eq('organization_id', context.organizationId)
         .eq('team_id', context.team.id)
         .order('issue_number', { ascending: true })
         .limit(500),
   ]);

   if (cyclesError || statusesError || issuesError) {
      return NextResponse.json({ error: 'Unable to load cycles.' }, { status: 500 });
   }

   const categoryByStatusId = new Map(
      (statuses ?? []).map((status) => [status.id, status.category as CycleIssueStatusCategory])
   );
   const issueRows = (issues ?? []) as IssueRow[];
   const issueByCycle = new Map<string, CycleIssueDto[]>();
   const backlogIssues: CycleIssueDto[] = [];

   for (const issue of issueRows) {
      const dto = issueDto(issue, context.team.issue_prefix, categoryByStatusId);
      if (!issue.cycle_id) {
         backlogIssues.push(dto);
         continue;
      }
      const group = issueByCycle.get(issue.cycle_id) ?? [];
      group.push(dto);
      issueByCycle.set(issue.cycle_id, group);
   }

   const response: CyclesCollectionResponse = {
      team: {
         id: context.team.id,
         name: context.team.name,
         key: context.team.key,
         issuePrefix: context.team.issue_prefix,
         color: context.team.color,
      },
      cycles: ((cycles ?? []) as CycleRow[]).map((cycle) =>
         cycleDto(cycle, issueByCycle.get(cycle.id) ?? [])
      ),
      backlogIssues,
      canWrite: context.role !== 'guest',
   };

   return NextResponse.json(response, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(
   request: NextRequest,
   { params }: { params: Promise<{ teamId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return NextResponse.json({ error: 'Invalid request body.' }, { status });
   }
   const parsed = createCycleSchema.safeParse(input);
   if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid cycle data.' }, { status: 400 });
   }

   const { teamId } = await params;
   const context = await authorizeCycleAccess(request, teamId, true, 'Unable to create cycle.');
   if (!context.ok) return context.response;

   const { data: overlap, error: overlapError } = await context.supabase
      .from('cycles')
      .select('id')
      .eq('organization_id', context.organizationId)
      .eq('team_id', context.team.id)
      .lte('starts_at', parsed.data.endDate)
      .gte('ends_at', parsed.data.startDate)
      .limit(1)
      .maybeSingle();
   if (overlapError) {
      return NextResponse.json({ error: 'Unable to create cycle.' }, { status: 500 });
   }
   if (overlap) {
      return NextResponse.json({ error: 'Cycle dates overlap an existing team cycle.' }, { status: 409 });
   }

   const { data, error } = await context.supabase
      .from('cycles')
      .insert({
         organization_id: context.organizationId,
         team_id: context.team.id,
         name: parsed.data.name,
         starts_at: parsed.data.startDate,
         ends_at: parsed.data.endDate,
      })
      .select('id, team_id, name, starts_at, ends_at, created_at, updated_at')
      .single();
   if (error || !data) {
      return NextResponse.json({ error: 'Unable to create cycle.' }, { status: 500 });
   }

   return NextResponse.json({ cycle: cycleDto(data as CycleRow, []) }, { status: 201 });
}
