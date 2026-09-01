import { create } from 'zustand';
import type {
   ProjectUpdateDto,
   ProjectUpdateHealth,
   ProjectUpdateKind,
} from '@/lib/project-updates/contracts';
import { users } from '@/mock-data/users';

interface ProjectUpdatesState {
   updatesByProject: Record<string, ProjectUpdateDto[]>;
   replaceProjectUpdates: (projectId: string, updates: ProjectUpdateDto[]) => void;
   prependProjectUpdate: (projectId: string, update: ProjectUpdateDto) => void;
   postLocalUpdate: (
      projectId: string,
      kind: ProjectUpdateKind,
      health: ProjectUpdateHealth | null,
      body: string
   ) => void;
   clearProjectUpdates: (projectId: string) => void;
}

let nextLocalId = 1;

/**
 * Project activity cache. Configured SaaS workspaces hydrate this from the
 * project-updates API; unconfigured development keeps an in-memory fallback.
 */
export const useProjectUpdatesStore = create<ProjectUpdatesState>((set) => ({
   updatesByProject: {},
   replaceProjectUpdates: (projectId, updates) =>
      set((state) => ({
         updatesByProject: { ...state.updatesByProject, [projectId]: updates },
      })),
   prependProjectUpdate: (projectId, update) =>
      set((state) => ({
         updatesByProject: {
            ...state.updatesByProject,
            [projectId]: [update, ...(state.updatesByProject[projectId] ?? [])],
         },
      })),
   postLocalUpdate: (projectId, kind, health, body) =>
      set((state) => {
         const author = users[0];
         const update: ProjectUpdateDto = {
            id: `local-project-update-${nextLocalId++}`,
            projectId,
            kind,
            health: kind === 'update' ? health : null,
            body,
            createdAt: new Date().toISOString(),
            author: {
               id: author.id,
               displayName: author.name,
               avatarUrl: author.avatarUrl,
            },
         };

         return {
            updatesByProject: {
               ...state.updatesByProject,
               [projectId]: [update, ...(state.updatesByProject[projectId] ?? [])],
            },
         };
      }),
   clearProjectUpdates: (projectId) =>
      set((state) => {
         if (!(projectId in state.updatesByProject)) return state;
         const updatesByProject = { ...state.updatesByProject };
         delete updatesByProject[projectId];
         return { updatesByProject };
      }),
}));
