import { z } from 'zod';

export const updateWorkspaceMemberRoleSchema = z
   .object({
      role: z.enum(['admin', 'member', 'guest']),
   })
   .strict();

export type WorkspaceMemberRole = 'owner' | 'admin' | 'member' | 'guest';

export type WorkspaceMemberDto = {
   id: string;
   displayName: string;
   avatarUrl: string | null;
   role: WorkspaceMemberRole;
   joinedAt: string;
   teamCount: number;
   createdIssueCount: number;
};
