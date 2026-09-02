'use client';

import { useMemo } from 'react';
import { GroupedIssuesView } from '@/components/common/issues/grouped-issues-view';
import { InsightsPanel } from '@/components/common/issues/insights-panel';
import ProjectsList from '@/components/common/projects/projects-list';
import type { ProjectGroup } from '@/components/common/projects/projects';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { filterIssuesForSavedView, filterProjectsForSavedView } from '@/lib/views/runtime';
import { status as allStatus } from '@/mock-data/status';
import { useIssuesStore } from '@/store/issues-store';
import { useProjectsStore } from '@/store/projects-store';
import { useRightPanelStore } from '@/store/right-panel-store';
import { useSavedViewsStore } from '@/store/saved-views-store';
import { useTeamsStore } from '@/store/teams-store';

export default function PersistentViewDetails({ viewId }: { viewId: string }) {
   const workspace = useWorkspace();
   const view = useSavedViewsStore((state) => state.views.find((item) => item.id === viewId));
   const loading = useSavedViewsStore((state) => state.loading);
   const viewsWorkspaceSlug = useSavedViewsStore((state) => state.workspaceSlug);
   const issues = useIssuesStore((state) => state.issues);
   const projects = useProjectsStore((state) => state.projects);
   const teams = useTeamsStore((state) => state.teams);
   const teamsLoading = useTeamsStore((state) => state.loading);
   const teamsWorkspaceSlug = useTeamsStore((state) => state.workspaceSlug);
   const { openPanel } = useRightPanelStore();
   const team = view?.teamId ? teams.find((candidate) => candidate.id === view.teamId) : undefined;
   const tenantReady =
      !loading &&
      !teamsLoading &&
      viewsWorkspaceSlug === workspace.organization.slug &&
      teamsWorkspaceSlug === workspace.organization.slug;
   const missingScopedTeam = Boolean(view?.teamId && !team);

   const filteredIssues = useMemo(() => {
      if (!view || view.viewType !== 'issue' || missingScopedTeam) return [];
      const source = team
         ? issues.filter((issue) => issue.identifier.startsWith(`${team.issuePrefix}-`))
         : issues;
      return filterIssuesForSavedView(view.filter, source);
   }, [issues, missingScopedTeam, team, view]);

   const projectGroups = useMemo<ProjectGroup[]>(() => {
      if (!view || view.viewType !== 'project' || missingScopedTeam) return [];
      const source = team ? projects.filter((project) => project.teamId === team.key) : projects;
      const filtered = filterProjectsForSavedView(view.filter, source);
      const byStatus = new Map<string, ProjectGroup>();
      for (const project of filtered) {
         const key = project.status.id;
         if (!byStatus.has(key)) {
            byStatus.set(key, { id: key, name: project.status.name, projects: [] });
         }
         byStatus.get(key)!.projects.push(project);
      }
      return [...byStatus.values()];
   }, [missingScopedTeam, projects, team, view]);

   if (!tenantReady) {
      return (
         <div className="flex h-full items-center justify-center text-sm text-muted-foreground" role="status">
            Loading saved view…
         </div>
      );
   }
   if (!view) {
      return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">View not found</div>;
   }
   if (missingScopedTeam) {
      return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Team-scoped view is unavailable</div>;
   }

   if (view.viewType === 'project') {
      return <ProjectsList groups={projectGroups} />;
   }

   return (
      <div className="w-full h-full flex flex-col overflow-hidden">
         <div className="flex-1 min-h-0 w-full flex overflow-hidden">
            <div className="flex-1 min-w-0 h-full overflow-hidden">
               <GroupedIssuesView
                  issues={filteredIssues}
                  totalIssues={filteredIssues}
                  statuses={allStatus}
                  isViewTypeGrid={false}
               />
            </div>
            {openPanel === 'insights' && (
               <aside className="hidden lg:flex w-[420px] shrink-0 border-l h-full overflow-hidden bg-container">
                  <InsightsPanel issues={filteredIssues} />
               </aside>
            )}
         </div>
      </div>
   );
}
