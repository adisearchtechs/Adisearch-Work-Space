'use client';

import { applyIssueFilters } from '@/components/common/issues/issue-filter-columns';
import { GroupedIssuesView } from '@/components/common/issues/grouped-issues-view';
import { InsightsPanel } from '@/components/common/issues/insights-panel';
import { IssueFilterBar } from '@/components/common/issues/issue-filter-bar';
import { SearchIssues } from '@/components/common/issues/search-issues';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { WorkspaceMemberDto } from '@/lib/workspace-members/contracts';
import type { WorkspaceIssue } from '@/lib/issues/types';
import { displayOrderedStatus } from '@/mock-data/status';
import { useFilterStore } from '@/store/filter-store';
import { useIssuesStore } from '@/store/issues-store';
import { useRightPanelStore } from '@/store/right-panel-store';
import { useSearchStore } from '@/store/search-store';
import { useTeamsStore } from '@/store/teams-store';
import { useViewStore } from '@/store/view-store';
import { formatDistanceToNowStrict } from 'date-fns';
import { parseAsString, useQueryState } from 'nuqs';
import { useMemo, type ReactNode } from 'react';

interface BreakdownRow {
   key: string;
   label: string;
   leading: ReactNode;
   count: number;
}

function BreakdownList({ rows }: { rows: BreakdownRow[] }) {
   if (rows.length === 0) {
      return <p className="text-xs text-muted-foreground px-1 py-3">Nothing to show yet.</p>;
   }
   return (
      <div className="flex flex-col">
         {rows.map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-3 py-2">
               <div className="flex items-center gap-2 min-w-0">
                  {row.leading}
                  <span className="text-sm truncate">{row.label}</span>
               </div>
               <span className="text-sm text-muted-foreground shrink-0">{row.count}</span>
            </div>
         ))}
      </div>
   );
}

function countBy(issues: WorkspaceIssue[], keyOf: (issue: WorkspaceIssue) => string[]) {
   const counts = new Map<string, number>();
   for (const issue of issues) {
      for (const key of keyOf(issue)) counts.set(key, (counts.get(key) ?? 0) + 1);
   }
   return counts;
}

const roleLabel = (role: WorkspaceMemberDto['role']) =>
   role.charAt(0).toUpperCase() + role.slice(1);

export default function PersistentMemberProfile({ member }: { member: WorkspaceMemberDto }) {
   const { issues } = useIssuesStore();
   const teams = useTeamsStore((state) => state.teams);
   const [activeTab] = useQueryState('tab', parseAsString.withDefault('assigned'));
   const { isSearchOpen, searchQuery } = useSearchStore();
   const { viewType } = useViewStore();
   const { filters } = useFilterStore();
   const { openPanel } = useRightPanelStore();

   const scopedIssues = useMemo(
      () =>
         activeTab === 'created'
            ? issues.filter((issue) => issue.creatorId === member.id)
            : issues.filter((issue) => issue.assignee?.id === member.id),
      [activeTab, issues, member.id]
   );
   const displayedIssues = useMemo(
      () => applyIssueFilters(scopedIssues, filters),
      [filters, scopedIssues]
   );
   const memberTeams = useMemo(
      () => teams.filter((team) => member.teamIds.includes(team.id)),
      [member.teamIds, teams]
   );

   const labelRows = useMemo<BreakdownRow[]>(() => {
      const counts = countBy(displayedIssues, (issue) => issue.labels.map((label) => label.id));
      const labels = new Map(
         displayedIssues.flatMap((issue) => issue.labels).map((label) => [label.id, label])
      );
      return [...labels.values()]
         .map((label) => ({
            key: label.id,
            label: label.name,
            leading: (
               <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
            ),
            count: counts.get(label.id) ?? 0,
         }))
         .sort((a, b) => b.count - a.count);
   }, [displayedIssues]);

   const priorityRows = useMemo<BreakdownRow[]>(() => {
      const counts = countBy(displayedIssues, (issue) => [issue.priority.id]);
      const priorities = new Map(displayedIssues.map((issue) => [issue.priority.id, issue.priority]));
      return [...priorities.values()]
         .map((priority) => ({
            key: priority.id,
            label: priority.name,
            leading: <priority.icon className="size-3.5 text-muted-foreground shrink-0" />,
            count: counts.get(priority.id) ?? 0,
         }))
         .sort((a, b) => b.count - a.count);
   }, [displayedIssues]);

   const projectRows = useMemo<BreakdownRow[]>(() => {
      const counts = countBy(displayedIssues, (issue) => (issue.project ? [issue.project.id] : []));
      const projects = new Map(
         displayedIssues
            .filter((issue) => issue.project)
            .map((issue) => [issue.project!.id, issue.project!])
      );
      return [...projects.values()]
         .map((project) => ({
            key: project.id,
            label: project.name,
            leading: <project.icon className="size-3.5 text-muted-foreground shrink-0" />,
            count: counts.get(project.id) ?? 0,
         }))
         .sort((a, b) => b.count - a.count);
   }, [displayedIssues]);

   if (isSearchOpen && searchQuery.trim() !== '') {
      return (
         <div className="w-full h-full">
            <div className="px-6 mb-6">
               <SearchIssues />
            </div>
         </div>
      );
   }

   return (
      <div className="w-full h-full flex flex-col overflow-hidden">
         <IssueFilterBar />
         <div className="flex-1 min-h-0 w-full flex overflow-hidden">
            <div className="flex-1 min-w-0 h-full overflow-hidden">
               <GroupedIssuesView
                  issues={displayedIssues}
                  totalIssues={scopedIssues}
                  statuses={displayOrderedStatus}
                  isViewTypeGrid={viewType === 'grid'}
               />
            </div>

            {openPanel === 'insights' && (
               <aside className="hidden lg:flex w-[420px] shrink-0 border-l h-full overflow-hidden bg-container">
                  <InsightsPanel issues={displayedIssues} />
               </aside>
            )}

            {openPanel !== 'hidden' && openPanel !== 'insights' && (
               <aside className="hidden lg:flex flex-col w-[340px] shrink-0 border-l h-full overflow-y-auto bg-container">
                  <div className="px-5 pt-5 pb-4 border-b">
                     <div className="flex items-center gap-3">
                        <Avatar className="size-11">
                           {member.avatarUrl && (
                              <AvatarImage src={member.avatarUrl} alt={member.displayName} />
                           )}
                           <AvatarFallback>{member.displayName[0] ?? '?'}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                           <h2 className="text-base font-semibold truncate">{member.displayName}</h2>
                           <p className="text-xs text-muted-foreground truncate">
                              {roleLabel(member.role)} workspace member
                           </p>
                        </div>
                     </div>
                  </div>

                  <div className="px-5 py-4 border-b flex flex-col gap-2.5 text-sm">
                     <div className="flex items-start justify-between gap-4">
                        <span className="text-muted-foreground shrink-0">Joined</span>
                        <span>
                           {formatDistanceToNowStrict(new Date(member.joinedAt), { addSuffix: true })}
                        </span>
                     </div>
                     <div className="flex items-start justify-between gap-4">
                        <span className="text-muted-foreground shrink-0">Role</span>
                        <span>{roleLabel(member.role)}</span>
                     </div>
                     <div className="flex items-start justify-between gap-4">
                        <span className="text-muted-foreground shrink-0">Created issues</span>
                        <span>{member.createdIssueCount}</span>
                     </div>
                     <div className="flex items-start justify-between gap-4">
                        <span className="text-muted-foreground shrink-0 pt-0.5">Teams</span>
                        <div className="flex flex-wrap justify-end gap-1.5">
                           {memberTeams.length > 0 ? (
                              memberTeams.map((team) => (
                                 <span
                                    key={team.id}
                                    className="inline-flex items-center gap-1.5 text-xs bg-accent rounded-md px-1.5 py-0.5"
                                 >
                                    <span className="size-2 rounded-full" style={{ backgroundColor: team.color }} />
                                    {team.name}
                                 </span>
                              ))
                           ) : (
                              <span className="text-xs text-muted-foreground">No teams</span>
                           )}
                        </div>
                     </div>
                  </div>

                  <div className="px-5 py-4">
                     <Tabs defaultValue="labels">
                        <TabsList className="h-8 bg-transparent gap-1 p-0">
                           <TabsTrigger value="labels" className="text-xs px-2.5 rounded-full">
                              Labels
                           </TabsTrigger>
                           <TabsTrigger value="priority" className="text-xs px-2.5 rounded-full">
                              Priority
                           </TabsTrigger>
                           <TabsTrigger value="projects" className="text-xs px-2.5 rounded-full">
                              Projects
                           </TabsTrigger>
                        </TabsList>
                        <TabsContent value="labels">
                           <BreakdownList rows={labelRows} />
                        </TabsContent>
                        <TabsContent value="priority">
                           <BreakdownList rows={priorityRows} />
                        </TabsContent>
                        <TabsContent value="projects">
                           <BreakdownList rows={projectRows} />
                        </TabsContent>
                     </Tabs>
                  </div>
               </aside>
            )}
         </div>
      </div>
   );
}
