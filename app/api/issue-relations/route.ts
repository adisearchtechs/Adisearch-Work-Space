import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { createIssueRelationSchema, type IssueRelationKind } from '@/lib/issue-relations/contracts';
import {
   authorizeIssueRelationAccess,
   issueExistsInRelationScope,
   UUID_PATTERN,
} from '@/lib/issue-relations/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function normalizeRelation(currentIssueId: string, targetIssueId: string, kind: IssueRelationKind) {
   if (kind === 'sub-issue') {
      return { sourceIssueId: currentIssueId, targetIssueId, relationType: 'parent' as const };
   }
   if (kind === 'parent') {
      return { sourceIssueId: targetIssueId, targetIssueId: currentIssueId, relationType: 'parent' as const };
   }
   if (kind === 'blocks') {
      return { sourceIssueId: currentIssueId, targetIssueId, relationType: 'blocks' as const };
   }
   if (kind === 'blocked-by') {
      return { sourceIssueId: targetIssueId, targetIssueId: currentIssueId, relationType: 'blocks' as const };
   }

   const [sourceIssueId, normalizedTargetIssueId] = [currentIssueId.toLowerCase(), targetIssueId.toLowerCase()].sort();
   return { sourceIssueId, targetIssueId: normalizedTargetIssueId, relationType: 'related' as const };
}

function serializeRelation(row: {
   id: string;
   source_issue_id: string;
   target_issue_id: string;
   relation_type: 'parent' | 'blocks' | 'related';
   created_at: string;
}) {
   return {
      id: row.id,
      sourceIssueId: row.source_issue_id,
      targetIssueId: row.target_issue_id,
      relationType: row.relation_type,
      createdAt: row.created_at,
   };
}

export async function GET(request: NextRequest) {
   if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
   }

   const issueId = request.nextUrl.searchParams.get('issue');
   if (!issueId || !UUID_PATTERN.test(issueId)) {
      return NextResponse.json({ error: 'Invalid issue.' }, { status: 400 });
   }

   const context = await authorizeIssueRelationAccess(request, false);
   if (!context.ok) return context.response;
   if (!(await issueExistsInRelationScope(context, issueId))) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   const { data, error } = await context.supabase
      .from('issue_relations')
      .select('id, source_issue_id, target_issue_id, relation_type, created_at')
      .eq('organization_id', context.organizationId)
      .or(`source_issue_id.eq.${issueId},target_issue_id.eq.${issueId}`)
      .order('created_at', { ascending: true });
   if (error) {
      return NextResponse.json({ error: 'Unable to load issue relations.' }, { status: 500 });
   }

   return NextResponse.json({ relations: (data ?? []).map(serializeRelation) });
}

export async function POST(request: NextRequest) {
   if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
   }
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const issueId = request.nextUrl.searchParams.get('issue');
   if (!issueId || !UUID_PATTERN.test(issueId)) {
      return NextResponse.json({ error: 'Invalid issue.' }, { status: 400 });
   }

   let body: unknown;
   try {
      body = await readJsonBody(request);
   } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return NextResponse.json({ error: 'Invalid request body.' }, { status });
   }
   const parsed = createIssueRelationSchema.safeParse(body);
   if (!parsed.success || parsed.data.targetIssueId.toLowerCase() === issueId.toLowerCase()) {
      return NextResponse.json({ error: 'Invalid issue relationship.' }, { status: 400 });
   }

   const context = await authorizeIssueRelationAccess(request, true);
   if (!context.ok) return context.response;
   const [currentExists, targetExists] = await Promise.all([
      issueExistsInRelationScope(context, issueId),
      issueExistsInRelationScope(context, parsed.data.targetIssueId),
   ]);
   if (!currentExists || !targetExists) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   const normalized = normalizeRelation(issueId, parsed.data.targetIssueId, parsed.data.kind);
   const { data, error } = await context.supabase
      .from('issue_relations')
      .insert({
         organization_id: context.organizationId,
         source_issue_id: normalized.sourceIssueId,
         target_issue_id: normalized.targetIssueId,
         relation_type: normalized.relationType,
         created_by: context.userId,
      })
      .select('id, source_issue_id, target_issue_id, relation_type, created_at')
      .single();

   if (error?.code === '23505') {
      return NextResponse.json({ error: 'Relationship already exists.' }, { status: 409 });
   }
   if (error?.code === '23514') {
      return NextResponse.json({ error: 'Invalid parent relationship.' }, { status: 400 });
   }
   if (error || !data) {
      return NextResponse.json({ error: 'Unable to create issue relationship.' }, { status: 500 });
   }

   return NextResponse.json({ relation: serializeRelation(data) }, { status: 201 });
}
