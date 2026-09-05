'use client';

import { useMemo } from 'react';
import { InsightsPanel } from '@/components/common/issues/insights-panel';
import { useProjectMilestones } from '@/components/common/projects/details/use-project-milestones';
import { useWorkspace } from '@/components/providers/workspace-provider';
import type { Issue } from '@/mock-data/issues';
import type { ProjectDetail } from '@/mock-data/project-details';
import type { Project } from '@/mock-data/projects';
import { useRightPanelStore } from '@/store/right-panel-store';
import PersistentProjectPropertiesPanel from './persistent-project-properties-panel';
import { ProjectPropertiesPanel } from './project-properties-panel';

interface ProjectSidePanelProps {
   project: Project;
   detail: ProjectDetail;
   issues: Issue[];
   insightsIssues?: Issue[];
}

export function ProjectSidePanel({
   project,
   detail,
   issues,
   insightsIssues,
}: ProjectSidePanelProps) {
   const workspace = useWorkspace();
   const { openPanel } = useRightPanelStore();
   const { milestones } = useProjectMilestones(project.id);
   const panelDetail = useMemo<ProjectDetail>(() => {
      if (!workspace.configured) return detail;
      return {
         ...detail,
         milestones: milestones.map((milestone) => ({
            id: milestone.id,
            name: milestone.name,
            targetDate: milestone.targetDate ?? undefined,
            completed: milestone.completed,
         })),
         activity: [],
      };
   }, [detail, milestones, workspace.configured]);

   if (openPanel === 'hidden') return null;

   return (
      <aside className="hidden xl:flex w-[380px] shrink-0 border-l h-full overflow-hidden bg-container">
         {openPanel === 'insights' ? (
            <InsightsPanel issues={insightsIssues ?? issues} />
         ) : workspace.configured ? (
            <PersistentProjectPropertiesPanel project={project} detail={panelDetail} issues={issues} />
         ) : (
            <ProjectPropertiesPanel project={project} detail={panelDetail} issues={issues} />
         )}
      </aside>
   );
}
