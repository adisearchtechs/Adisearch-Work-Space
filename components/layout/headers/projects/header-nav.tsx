'use client';

import { CreateProjectDialog } from '@/components/common/projects/create-project-dialog';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useProjectsStore } from '@/store/projects-store';

export default function HeaderNav() {
   const workspace = useWorkspace();
   const projectCount = useProjectsStore((state) => state.projects.length);
   const workspaceSlug = useProjectsStore((state) => state.workspaceSlug);
   const displayedCount =
      workspace.configured && workspaceSlug !== workspace.organization.slug ? 0 : projectCount;

   return (
      <div className="w-full flex justify-between items-center border-b py-1.5 px-6 h-10">
         <div className="flex items-center gap-2">
            <SidebarTrigger className="" />
            <div className="flex items-center gap-1">
               <span className="text-sm font-medium">Projects</span>
               <span className="text-xs bg-accent rounded-md px-1.5 py-1">{displayedCount}</span>
            </div>
         </div>
         <div className="flex items-center gap-2">
            <CreateProjectDialog />
         </div>
      </div>
   );
}
