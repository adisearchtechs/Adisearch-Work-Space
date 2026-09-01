import { create } from 'zustand';
import type { ProjectMilestoneDto } from '@/lib/project-milestones/contracts';

interface ProjectMilestonesState {
   milestonesByProject: Record<string, ProjectMilestoneDto[]>;
   loadingByProject: Record<string, boolean>;
   loadedByProject: Record<string, boolean>;
   setProjectMilestonesLoading: (projectId: string, loading: boolean) => void;
   replaceProjectMilestones: (projectId: string, milestones: ProjectMilestoneDto[]) => void;
   addProjectMilestone: (projectId: string, milestone: ProjectMilestoneDto) => void;
   updateProjectMilestone: (
      projectId: string,
      milestoneId: string,
      patch: Partial<ProjectMilestoneDto>
   ) => void;
   removeProjectMilestone: (projectId: string, milestoneId: string) => void;
   invalidateProjectMilestones: (projectId: string) => void;
}

const orderMilestones = (milestones: ProjectMilestoneDto[]) =>
   [...milestones].sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));

export const useProjectMilestonesStore = create<ProjectMilestonesState>((set) => ({
   milestonesByProject: {},
   loadingByProject: {},
   loadedByProject: {},
   setProjectMilestonesLoading: (projectId, loading) =>
      set((state) => ({
         loadingByProject: { ...state.loadingByProject, [projectId]: loading },
      })),
   replaceProjectMilestones: (projectId, milestones) =>
      set((state) => ({
         milestonesByProject: {
            ...state.milestonesByProject,
            [projectId]: orderMilestones(milestones),
         },
         loadingByProject: { ...state.loadingByProject, [projectId]: false },
         loadedByProject: { ...state.loadedByProject, [projectId]: true },
      })),
   addProjectMilestone: (projectId, milestone) =>
      set((state) => ({
         milestonesByProject: {
            ...state.milestonesByProject,
            [projectId]: orderMilestones([
               ...(state.milestonesByProject[projectId] ?? []),
               milestone,
            ]),
         },
      })),
   updateProjectMilestone: (projectId, milestoneId, patch) =>
      set((state) => ({
         milestonesByProject: {
            ...state.milestonesByProject,
            [projectId]: orderMilestones(
               (state.milestonesByProject[projectId] ?? []).map((milestone) =>
                  milestone.id === milestoneId ? { ...milestone, ...patch } : milestone
               )
            ),
         },
      })),
   removeProjectMilestone: (projectId, milestoneId) =>
      set((state) => ({
         milestonesByProject: {
            ...state.milestonesByProject,
            [projectId]: (state.milestonesByProject[projectId] ?? []).filter(
               (milestone) => milestone.id !== milestoneId
            ),
         },
      })),
   invalidateProjectMilestones: (projectId) =>
      set((state) => ({
         loadedByProject: { ...state.loadedByProject, [projectId]: false },
      })),
}));
