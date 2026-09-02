'use client';

import type { Issue } from '@/mock-data/issues';
import { getStatusesByCategory, type StatusCategory, displayOrderedStatus } from '@/mock-data/status';
import { useFilterStore } from '@/store/filter-store';
import { useIssuesStore } from '@/store/issues-store';
import { resolveTeamReference, useTeamsStore } from '@/store/teams-store';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { applyIssueFilters } from './issue-filter-columns';
import { IssueFilterBar } from './issue-filter-bar';
import { useRightPanelStore } from '@/store/right-panel-store';
import { useSearchStore } from '@/store/search-store';
import { useViewStore } from '@/store/view-store';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { GroupedIssuesView } from './grouped-issues-view';
import { InsightsPanel } from './insights-panel';
import { SearchIssues } from './search-issues';

interface AllIssuesProps {
   categories?: StatusCategory[];
}

export default function AllIssues({ categories }: AllIssuesProps) {
   const workspace = useWorkspace();
   const params = useParams<{ teamId?: string }>();
   const routeTeamReference = params?.teamId;
   const tenantTeams = useTeamsStore((state) => state.teams);
   const teamsWorkspaceSlug = useTeamsStore((state) => state.workspaceSlug);
   const teamsLoading = useTeamsStore((state) => state.loading);
   const resolvedTeam =
      workspace.configured && routeTeamReference && teamsWorkspaceSlug === workspace.organization.slug
         ? resolveTeamReference(tenantTeams, routeTeamReference)
         : undefined;
   const { isSearchOpen, searchQuery } = useSearchStore();
   const { viewType } = useViewStore();
   const { filters } = useFilterStore();
   const { issues } = useIssuesStore();
   const { openPanel } = useRightPanelStore();

   const isSearching = isSearchOpen && searchQuery.trim() !== '';
   const isViewTypeGrid = viewType === 'grid';

   const statuses = useMemo(
      () => (categories ? getStatusesByCategory(categories) : displayOrderedStatus),
      [categories]
   );

   const scopedIssues = useMemo<Issue[]>(() => {
      let list = categories
         ? issues.filter((issue) => categories.includes(issue.status.category))
         : issues;

      if (workspace.configured && routeTeamReference) {
         if (!resolvedTeam) return [];
         const prefix = `${resolvedTeam.issuePrefix}-`;
         list = list.filter((issue) => issue.identifier.startsWith(prefix));
      }
      return list;
   }, [categories, issues, resolvedTeam, routeTeamReference, workspace.configured]);

   const displayedIssues = useMemo(
      () => applyIssueFilters(scopedIssues, filters),
      [scopedIssues, filters]
   );

   if (
      workspace.configured &&
      routeTeamReference &&
      (teamsLoading || teamsWorkspaceSlug !== workspace.organization.slug)
   ) {
      return <div className="flex h-full items-center justify-center text-sm text-muted-foreground" role="status">Loading team issues…</div>;
   }

   if (workspace.configured && routeTeamReference && !resolvedTeam) {
      return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Team not found.</div>;
   }

   if (isSearching) {
      return (
         <div className="w-full h-full">
            <div className="px-6 mb-6">
               <SearchIssues issues={scopedIssues} />
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
                  statuses={statuses}
                  isViewTypeGrid={isViewTypeGrid}
               />
            </div>

            {openPanel === 'insights' && (
               <aside className="hidden lg:flex w-[420px] shrink-0 border-l h-full overflow-hidden bg-container">
                  <InsightsPanel issues={displayedIssues} />
               </aside>
            )}
         </div>
      </div>
   );
}
