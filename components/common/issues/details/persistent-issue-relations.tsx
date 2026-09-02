'use client';

import { useWorkspace } from '@/components/providers/workspace-provider';
import { Button } from '@/components/ui/button';
import type { IssueRelationKind } from '@/lib/issue-relations/contracts';
import type { Issue } from '@/mock-data/issues';
import { useIssuesStore } from '@/store/issues-store';
import { Ban, GitBranch, Link2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Relation = {
   id: string;
   sourceIssueId: string;
   targetIssueId: string;
   relationType: 'parent' | 'blocks' | 'related';
   createdAt: string;
};

type RelationGroup = {
   key: string;
   title: string;
   icon: React.ReactNode;
   items: Array<{ relation: Relation; targetId: string }>;
};

const relationOptions: Array<{ value: IssueRelationKind; label: string }> = [
   { value: 'sub-issue', label: 'Sub-issue' },
   { value: 'parent', label: 'Parent' },
   { value: 'blocked-by', label: 'Blocked by' },
   { value: 'blocks', label: 'Blocks' },
   { value: 'related', label: 'Related' },
];

export function PersistentIssueRelations({ issue }: { issue: Issue }) {
   const workspace = useWorkspace();
   const issues = useIssuesStore((state) => state.issues);
   const [relations, setRelations] = useState<Relation[]>([]);
   const [kind, setKind] = useState<IssueRelationKind>('sub-issue');
   const [targetIssueId, setTargetIssueId] = useState('');
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const canWrite = workspace.user.role !== 'guest';

   const candidates = useMemo(
      () => issues.filter((candidate) => candidate.id !== issue.id),
      [issue.id, issues]
   );

   useEffect(() => {
      const controller = new AbortController();
      setLoading(true);
      setError(null);
      void fetch(
         `/api/issue-relations?organization=${encodeURIComponent(workspace.organization.slug)}&issue=${encodeURIComponent(issue.id)}`,
         { credentials: 'same-origin', signal: controller.signal }
      )
         .then(async (response) => {
            if (!response.ok) throw new Error('Unable to load issue relationships.');
            const payload = (await response.json()) as { relations?: Relation[] };
            setRelations(payload.relations ?? []);
         })
         .catch((requestError: unknown) => {
            if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
            setError(requestError instanceof Error ? requestError.message : 'Unable to load issue relationships.');
         })
         .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
         });
      return () => controller.abort();
   }, [issue.id, workspace.organization.slug]);

   const groups = useMemo<RelationGroup[]>(() => {
      const parent: RelationGroup['items'] = [];
      const subIssues: RelationGroup['items'] = [];
      const blockedBy: RelationGroup['items'] = [];
      const blocks: RelationGroup['items'] = [];
      const related: RelationGroup['items'] = [];

      for (const relation of relations) {
         if (relation.relationType === 'parent') {
            if (relation.sourceIssueId === issue.id) {
               subIssues.push({ relation, targetId: relation.targetIssueId });
            } else if (relation.targetIssueId === issue.id) {
               parent.push({ relation, targetId: relation.sourceIssueId });
            }
         } else if (relation.relationType === 'blocks') {
            if (relation.sourceIssueId === issue.id) {
               blocks.push({ relation, targetId: relation.targetIssueId });
            } else if (relation.targetIssueId === issue.id) {
               blockedBy.push({ relation, targetId: relation.sourceIssueId });
            }
         } else {
            related.push({
               relation,
               targetId:
                  relation.sourceIssueId === issue.id ? relation.targetIssueId : relation.sourceIssueId,
            });
         }
      }

      return [
         { key: 'parent', title: 'Parent', icon: <GitBranch className="size-3.5" />, items: parent },
         { key: 'sub-issues', title: 'Sub-issues', icon: <GitBranch className="size-3.5" />, items: subIssues },
         { key: 'blocked-by', title: 'Blocked by', icon: <Ban className="size-3.5" />, items: blockedBy },
         { key: 'blocks', title: 'Blocks', icon: <Ban className="size-3.5" />, items: blocks },
         { key: 'related', title: 'Related', icon: <Link2 className="size-3.5" />, items: related },
      ];
   }, [issue.id, relations]);

   async function addRelation() {
      if (!targetIssueId || saving) return;
      setSaving(true);
      setError(null);
      try {
         const response = await fetch(
            `/api/issue-relations?organization=${encodeURIComponent(workspace.organization.slug)}&issue=${encodeURIComponent(issue.id)}`,
            {
               method: 'POST',
               credentials: 'same-origin',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ targetIssueId, kind }),
            }
         );
         const payload = (await response.json().catch(() => ({}))) as { relation?: Relation; error?: string };
         if (!response.ok || !payload.relation) {
            throw new Error(payload.error || 'Unable to add issue relationship.');
         }
         setRelations((current) => [...current, payload.relation!]);
         setTargetIssueId('');
      } catch (requestError) {
         setError(requestError instanceof Error ? requestError.message : 'Unable to add issue relationship.');
      } finally {
         setSaving(false);
      }
   }

   async function removeRelation(relationId: string) {
      if (!canWrite) return;
      setError(null);
      const response = await fetch(
         `/api/issue-relations/${encodeURIComponent(relationId)}?organization=${encodeURIComponent(workspace.organization.slug)}`,
         { method: 'DELETE', credentials: 'same-origin' }
      );
      if (!response.ok) {
         const payload = (await response.json().catch(() => ({}))) as { error?: string };
         setError(payload.error || 'Unable to remove issue relationship.');
         return;
      }
      setRelations((current) => current.filter((relation) => relation.id !== relationId));
   }

   const visibleGroups = groups.filter((group) => group.items.length > 0);

   return (
      <section className="mt-8" aria-label="Issue relationships">
         <div className="flex items-center justify-between gap-4 mb-2">
            <h2 className="text-sm font-medium">Relationships</h2>
            {loading && <span className="text-xs text-muted-foreground">Loading…</span>}
         </div>

         {visibleGroups.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">No issue relationships yet.</p>
         )}

         <div className="flex flex-col gap-4">
            {visibleGroups.map((group) => (
               <div key={group.key}>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                     {group.icon}
                     <span>{group.title}</span>
                     {group.key === 'sub-issues' && (
                        <span>
                           {group.items.filter(({ targetId }) => {
                              const target = issues.find((candidate) => candidate.id === targetId);
                              return target?.status.category === 'completed';
                           }).length}/{group.items.length}
                        </span>
                     )}
                  </div>
                  <div className="flex flex-col border-t border-border/50">
                     {group.items.map(({ relation, targetId }) => {
                        const target = issues.find((candidate) => candidate.id === targetId);
                        return (
                           <div key={relation.id} className="flex items-center gap-2 min-h-10 border-b border-border/50 text-sm">
                              {target ? (
                                 <Link
                                    href={`/${workspace.organization.slug}/issue/${target.identifier}`}
                                    className="flex min-w-0 flex-1 items-center gap-2 hover:bg-sidebar/50 px-1 py-2 rounded-sm"
                                 >
                                    <target.status.icon />
                                    <span className="text-muted-foreground shrink-0 text-xs font-medium">{target.identifier}</span>
                                    <span className="truncate font-medium">{target.title}</span>
                                 </Link>
                              ) : (
                                 <span className="min-w-0 flex-1 text-muted-foreground">Issue unavailable</span>
                              )}
                              {canWrite && (
                                 <button
                                    type="button"
                                    className="p-1 text-muted-foreground hover:text-foreground"
                                    aria-label={`Remove ${group.title.toLowerCase()} relationship`}
                                    onClick={() => void removeRelation(relation.id)}
                                 >
                                    <Trash2 className="size-3.5" />
                                 </button>
                              )}
                           </div>
                        );
                     })}
                  </div>
               </div>
            ))}
         </div>

         {canWrite && candidates.length > 0 && (
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
               <select
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                  aria-label="Relationship type"
                  value={kind}
                  onChange={(event) => setKind(event.target.value as IssueRelationKind)}
               >
                  {relationOptions.map((option) => (
                     <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
               </select>
               <select
                  className="h-9 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm"
                  aria-label="Related issue"
                  value={targetIssueId}
                  onChange={(event) => setTargetIssueId(event.target.value)}
               >
                  <option value="">Select issue…</option>
                  {candidates.map((candidate) => (
                     <option key={candidate.id} value={candidate.id}>
                        {candidate.identifier} — {candidate.title}
                     </option>
                  ))}
               </select>
               <Button type="button" size="sm" disabled={!targetIssueId || saving} onClick={() => void addRelation()}>
                  {saving ? 'Adding…' : 'Add relation'}
               </Button>
            </div>
         )}

         {error && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
      </section>
   );
}
