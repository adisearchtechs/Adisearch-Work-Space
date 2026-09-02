import type { TeamDto } from '@/lib/teams/contracts';
import { create } from 'zustand';

export function resolveTeamReference(teams: readonly TeamDto[], reference: string) {
   const normalized = reference.toUpperCase();
   return teams.find((team) => team.id === reference || team.key.toUpperCase() === normalized);
}

interface TeamsState {
   teams: TeamDto[];
   joinedTeamIds: string[];
   workspaceSlug: string | null;
   loading: boolean;
   beginLoad: (workspaceSlug: string) => void;
   replaceTeams: (workspaceSlug: string, teams: TeamDto[], joinedTeamIds: string[]) => void;
   clearTeams: () => void;
   getTeamByReference: (reference: string) => TeamDto | undefined;
}

export const useTeamsStore = create<TeamsState>((set, get) => ({
   teams: [],
   joinedTeamIds: [],
   workspaceSlug: null,
   loading: false,
   beginLoad: (workspaceSlug) =>
      set({ teams: [], joinedTeamIds: [], workspaceSlug, loading: true }),
   replaceTeams: (workspaceSlug, teams, joinedTeamIds) =>
      set({ teams, joinedTeamIds, workspaceSlug, loading: false }),
   clearTeams: () => set({ teams: [], joinedTeamIds: [], workspaceSlug: null, loading: false }),
   getTeamByReference: (reference) => resolveTeamReference(get().teams, reference),
}));
