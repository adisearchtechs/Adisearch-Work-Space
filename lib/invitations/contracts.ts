import { z } from 'zod';

export const invitationRoleSchema = z.enum(['admin', 'member', 'guest']);

export const createWorkspaceInvitationSchema = z
   .object({
      email: z
         .string()
         .trim()
         .email()
         .max(254)
         .transform((value) => value.toLowerCase()),
      role: invitationRoleSchema.default('member'),
      teamIds: z.array(z.string().uuid()).max(50).default([]),
   })
   .strict();

export const acceptWorkspaceInvitationSchema = z
   .object({
      token: z.string().trim().regex(/^[A-Za-z0-9_-]{40,96}$/),
   })
   .strict();

export type WorkspaceInvitationRole = z.infer<typeof invitationRoleSchema>;
export type WorkspaceInvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export type WorkspaceInvitationDto = {
   id: string;
   email: string;
   role: WorkspaceInvitationRole;
   teamIds: string[];
   invitedBy: string;
   createdAt: string;
   expiresAt: string;
   acceptedAt: string | null;
   revokedAt: string | null;
   status: WorkspaceInvitationStatus;
};
