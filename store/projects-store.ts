import { projects as mockProjects, type Project } from '@/mock-data/projects';
import { teams as mockTeams } from '@/mock-data/teams';
import type { ProjectTeamDto } from '@/lib/projects/contracts';
import { create } from 'zustand';

interface ProjectPersistenceAdapter {
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
   deleteProject: (id: string) => Promise<void>;
   getProjectById: (id: string) => Project | undefined;
}

const initialTeams: ProjectTeamDto[] = mockTeams.map((team) => ({
   id: team.id,
   key: team.id,
   name: team.name,
   color: team.color,
}));

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
