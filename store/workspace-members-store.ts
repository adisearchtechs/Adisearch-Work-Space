import type { WorkspaceMemberDto, WorkspaceMemberRole } from '@/lib/workspace-members/contracts';
import { create } from 'zustand';

interface WorkspaceMembersState {
   members: WorkspaceMemberDto[];
   workspaceSlug: string | null;
   currentUserId: string | null;
   actorRole: WorkspaceMemberRole | null;
   canAdmin: boolean;
   loading: boolean;
   beginLoad: (workspaceSlug: string) => void;
   replaceMembers: (
      workspaceSlug: string,
      members: WorkspaceMemberDto[],
      currentUserId: string,
      actorRole: WorkspaceMemberRole,
      canAdmin: boolean
   ) => void;
   clearMembers: () => void;
}

export const useWorkspaceMembersStore = create<WorkspaceMembersState>((set) => ({
   members: [],
   workspaceSlug: null,
   currentUserId: null,
   actorRole: null,
   canAdmin: false,
   loading: false,
   beginLoad: (workspaceSlug) =>
      set({
         members: [],
         workspaceSlug,
         currentUserId: null,
         actorRole: null,
         canAdmin: false,
         loading: true,
      }),
   replaceMembers: (workspaceSlug, members, currentUserId, actorRole, canAdmin) =>
      set({ members, workspaceSlug, currentUserId, actorRole, canAdmin, loading: false }),
   clearMembers: () =>
      set({
         members: [],
         workspaceSlug: null,
         currentUserId: null,
         actorRole: null,
         canAdmin: false,
         loading: false,
      }),
}));
