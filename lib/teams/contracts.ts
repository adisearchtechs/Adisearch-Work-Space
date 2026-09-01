import { z } from 'zod';

const teamNameSchema = z.string().trim().min(2).max(80);
const teamCodeSchema = z
   .string()
   .trim()
   .transform((value) => value.toUpperCase())
   .pipe(z.string().regex(/^[A-Z][A-Z0-9]{1,9}$/));
const teamColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

export const createTeamSchema = z
   .object({
      name: teamNameSchema,
      key: teamCodeSchema,
      issuePrefix: teamCodeSchema,
      color: teamColorSchema,
   })
   .strict();

export const updateTeamSchema = z
   .object({
      name: teamNameSchema.optional(),
      key: teamCodeSchema.optional(),
      issuePrefix: teamCodeSchema.optional(),
      color: teamColorSchema.optional(),
   })
   .strict()
   .refine(
      (value) =>
         value.name !== undefined ||
         value.key !== undefined ||
         value.issuePrefix !== undefined ||
         value.color !== undefined,
      'At least one team field is required.'
   );

export const updateTeamMembershipSchema = z
   .object({ userId: z.string().uuid() })
   .strict();

export type OrganizationRole = 'owner' | 'admin' | 'member' | 'guest';

export type TeamMemberDto = {
   id: string;
   displayName: string;
   avatarUrl: string | null;
   role: OrganizationRole;
};

export type TeamUsageDto = {
   members: number;
   issues: number;
   projects: number;
   cycles: number;
};

export type TeamDto = {
   id: string;
   name: string;
   key: string;
   issuePrefix: string;
   color: string;
   createdAt: string;
   updatedAt: string;
   usage: TeamUsageDto;
};

export type TeamDetailsDto = TeamDto & {
   members: TeamMemberDto[];
   organizationMembers: TeamMemberDto[];
};
