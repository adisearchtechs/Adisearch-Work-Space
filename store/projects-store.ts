import { projects as mockProjects, type Project } from '@/mock-data/projects';
import { teams as mockTeams } from '@/mock-data/teams';
import type { ProjectTeamDto, ProjectUpdate } from '@/lib/projects/contracts';
import { applyProjectUpdate } from '@/lib/projects/mapper';
import { create } from 'zustand';

interface ProjectPersistenceAdapter {
   update: (id: string, changes: ProjectUpdate) => Promise<void>;
   delete: (id: string) => Promise<void>;
   onError: (message: string) => void;
}

interface ProjectsState {
   projects: Project[];
   teams: ProjectTeamDto[];
   workspaceSlug: string | null;
   loading: boolean;
   persistenceAdapter: ProjectPersistenceAdapter | null;
   replaceWorkspace: (
      projects: Project[],
      teams: ProjectTeamDto[],
      workspaceSlug: string | null
   ) => void;
   setLoading: (loading: boolean) => void;
   setPersistenceAdapter: (adapter: ProjectPersistenceAdapter | null) => void;
   addProject: (project: Project) => void;
   updateProject: (id: string, changes: ProjectUpdate) => Promise<void>;
   deleteProject: (id: string) => Promise<void>;
   getProjectById: (id: string) => Project | undefined;
}

const initialTeams: ProjectTeamDto[] = mockTeams.map((team) => ({
   id: team.id,
   key: team.id,
   name: team.name,
   color: team.color,
}));

function restoreRejectedProjectUpdate(
   currentProject: Project,
   previousProject: Project,
   optimisticProject: Project,
   changes: ProjectUpdate
) {
   const restoredProject = { ...currentProject };

   if (changes.name !== undefined && currentProject.name === optimisticProject.name) {
      restoredProject.name = previousProject.name;
   }
   if (
      changes.targetDate !== undefined &&
      currentProject.targetDate === optimisticProject.targetDate
   ) {
      restoredProject.targetDate = previousProject.targetDate;
   }
   if (changes.status !== undefined && currentProject.status.id === optimisticProject.status.id) {
      restoredProject.status = previousProject.status;
      restoredProject.health = previousProject.health;
      restoredProject.percentComplete = previousProject.percentComplete;
   }

   return restoredProject;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
   projects: mockProjects,
   teams: initialTeams,
   workspaceSlug: null,
   loading: false,
   persistenceAdapter: null,
   replaceWorkspace: (projects, teams, workspaceSlug) => set({ projects, teams, workspaceSlug }),
   setLoading: (loading) => set({ loading }),
   setPersistenceAdapter: (persistenceAdapter) => set({ persistenceAdapter }),
   addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
   updateProject: async (id, changes) => {
      const previousProject = get().projects.find((project) => project.id === id);
      if (!previousProject) return;

      const optimisticProject = applyProjectUpdate(previousProject, changes);
      set((state) => ({
         projects: state.projects.map((project) =>
            project.id === id ? optimisticProject : project
         ),
      }));

      const adapter = get().persistenceAdapter;
      if (!adapter) return;

      try {
         await adapter.update(id, changes);
      } catch (error) {
         if (get().persistenceAdapter === adapter) {
            set((state) => ({
               projects: state.projects.map((project) =>
                  project.id === id
                     ? restoreRejectedProjectUpdate(
                          project,
                          previousProject,
                          optimisticProject,
                          changes
                       )
                     : project
               ),
            }));
            adapter.onError('The project update was not saved. Your change was reverted.');
         }
         throw error;
      }
   },
   deleteProject: async (id) => {
      const deletedProject = get().projects.find((project) => project.id === id);
      if (!deletedProject) return;

      set((state) => ({ projects: state.projects.filter((project) => project.id !== id) }));

      const adapter = get().persistenceAdapter;
      if (!adapter) return;

      try {
         await adapter.delete(id);
      } catch (error) {
         if (get().persistenceAdapter === adapter) {
            set((state) => {
               if (state.projects.some((project) => project.id === id)) return state;
               return { projects: [...state.projects, deletedProject] };
            });
            adapter.onError('The project could not be deleted. It has been restored.');
         }
         throw error;
      }
   },
   getProjectById: (id) => get().projects.find((project) => project.id === id),
}));
