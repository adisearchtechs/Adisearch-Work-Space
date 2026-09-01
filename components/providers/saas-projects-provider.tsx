'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useWorkspace } from '@/components/providers/workspace-provider';
import type { ProjectDto, ProjectTeamDto, ProjectUpdate } from '@/lib/projects/contracts';
import { projectDtoToProject } from '@/lib/projects/mapper';
import { useProjectsStore } from '@/store/projects-store';
import { useIssuesStore } from '@/store/issues-store';

function supportedProjectChanges(changes: ProjectUpdate): ProjectUpdate {
   return {
      ...(changes.name !== undefined && { name: changes.name }),
      ...(changes.status !== undefined && { status: changes.status }),
      ...(changes.targetDate !== undefined && { targetDate: changes.targetDate }),
   };
}

async function updateProject(id: string, changes: ProjectUpdate, organizationSlug: string) {
   const response = await fetch(
      `/api/projects/${encodeURIComponent(id)}?organization=${encodeURIComponent(organizationSlug)}`,
      {
         method: 'PATCH',
         credentials: 'same-origin',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(supportedProjectChanges(changes)),
      }
   );

   if (!response.ok) {
      throw new Error(`Project update failed with ${response.status}.`);
   }
}

async function deleteProject(id: string, organizationSlug: string) {
   const response = await fetch(
      `/api/projects/${encodeURIComponent(id)}?organization=${encodeURIComponent(organizationSlug)}`,
      {
         method: 'DELETE',
         credentials: 'same-origin',
      }
   );

   if (!response.ok) {
      throw new Error(`Project deletion failed with ${response.status}.`);
   }

   // The database clears issue.project_id through the tenant-scoped foreign key.
   useIssuesStore.getState().clearProjectReferences(id);
}

export function SaasProjectsProvider({ children }: { children: React.ReactNode }) {
   const workspace = useWorkspace();

   useEffect(() => {
      if (!workspace.configured) return;

      const controller = new AbortController();
      const store = useProjectsStore.getState();
      // Never render projects or teams from a previous tenant during a workspace transition.
      store.replaceWorkspace([], [], workspace.organization.slug);
      store.setLoading(true);
      store.setPersistenceAdapter({
         update(id, changes) {
            return updateProject(id, changes, workspace.organization.slug);
         },
         delete(id) {
            return deleteProject(id, workspace.organization.slug);
         },
         onError(message) {
            toast.error(message);
         },
      });

      void fetch(`/api/projects?organization=${encodeURIComponent(workspace.organization.slug)}`, {
         credentials: 'same-origin',
         signal: controller.signal,
         headers: { Accept: 'application/json' },
      })
         .then(async (response) => {
            if (!response.ok) throw new Error(`Project load failed with ${response.status}.`);
            return (await response.json()) as {
               projects: ProjectDto[];
               teams: ProjectTeamDto[];
            };
         })
         .then(({ projects, teams }) => {
            if (controller.signal.aborted) return;
            const currentStore = useProjectsStore.getState();
            currentStore.replaceWorkspace(
               projects.map(projectDtoToProject),
               teams,
               workspace.organization.slug
            );
            currentStore.setLoading(false);
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            useProjectsStore.getState().setLoading(false);
            toast.error('Unable to load workspace projects.');
         });

      return () => {
         controller.abort();
         const currentStore = useProjectsStore.getState();
         currentStore.setPersistenceAdapter(null);
         currentStore.replaceWorkspace([], [], null);
         currentStore.setLoading(false);
      };
   }, [workspace.configured, workspace.organization.slug]);

   return children;
}
