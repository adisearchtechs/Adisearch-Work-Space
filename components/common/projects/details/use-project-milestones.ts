'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useWorkspace } from '@/components/providers/workspace-provider';
import type { ProjectMilestoneDto } from '@/lib/project-milestones/contracts';
import { useProjectMilestonesStore } from '@/store/project-milestones-store';

const EMPTY_MILESTONES: ProjectMilestoneDto[] = [];

export function useProjectMilestones(projectId: string) {
   const workspace = useWorkspace();
   const milestones = useProjectMilestonesStore(
      (state) => state.milestonesByProject[projectId] ?? EMPTY_MILESTONES
   );
   const loading = useProjectMilestonesStore(
      (state) => state.loadingByProject[projectId] ?? false
   );
   const loaded = useProjectMilestonesStore((state) => state.loadedByProject[projectId] ?? false);
   const setLoading = useProjectMilestonesStore((state) => state.setProjectMilestonesLoading);
   const replaceMilestones = useProjectMilestonesStore((state) => state.replaceProjectMilestones);

   useEffect(() => {
      if (!workspace.configured || loaded) return;
      const current = useProjectMilestonesStore.getState();
      if (current.loadingByProject[projectId] || current.loadedByProject[projectId]) return;

      const controller = new AbortController();
      setLoading(projectId, true);

      void fetch(
         `/api/projects/${encodeURIComponent(projectId)}/milestones?organization=${encodeURIComponent(workspace.organization.slug)}`,
         {
            credentials: 'same-origin',
            signal: controller.signal,
            headers: { Accept: 'application/json' },
         }
      )
         .then(async (response) => {
            if (!response.ok) {
               throw new Error(`Project milestones load failed with ${response.status}.`);
            }
            return (await response.json()) as { milestones: ProjectMilestoneDto[] };
         })
         .then(({ milestones: loadedMilestones }) => {
            if (controller.signal.aborted) return;
            replaceMilestones(projectId, loadedMilestones);
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            replaceMilestones(projectId, []);
            toast.error('Unable to load project milestones.');
         });

      return () => controller.abort();
   }, [
      loaded,
      projectId,
      replaceMilestones,
      setLoading,
      workspace.configured,
      workspace.organization.slug,
   ]);

   return {
      milestones,
      loading: workspace.configured ? loading && !loaded : false,
      configured: workspace.configured,
   };
}
