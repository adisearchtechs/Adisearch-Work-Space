'use client';

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
   detail?: ProjectDetail;
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
   const { milestones, loading: milestonesLoading } = useProjectMilestones(project.id);

   if (openPanel === 'hidden') return null;

   if (openPanel === 'insights') {
      return (
         <aside className="hidden xl:flex w-[380px] shrink-0 border-l h-full overflow-hidden bg-container">
            <InsightsPanel issues={insightsIssues ?? issues} />
         </aside>
      );
   }

   if (workspace.configured) {
      return (
         <aside className="hidden xl:flex w-[380px] shrink-0 border-l h-full overflow-hidden bg-container">
            <PersistentProjectPropertiesPanel
               project={project}
               milestones={milestones}
               milestonesLoading={milestonesLoading}
               issues={issues}
            />
         </aside>
      );
   }

   if (!detail) return null;

   return (
      <aside className="hidden xl:flex w-[380px] shrink-0 border-l h-full overflow-hidden bg-container">
         <ProjectPropertiesPanel project={project} detail={detail} issues={issues} />
      </aside>
   );
}
