import { z } from 'zod';

const organizationSlugSchema = z
   .string()
   .min(2)
   .max(48)
   .regex(/^[a-z0-9-]+$/);

const teamKeySchema = z
   .string()
   .min(2)
   .max(10)
   .regex(/^[A-Z][A-Z0-9]+$/);

export const projectStatusSchema = z.enum(['planned', 'active', 'paused', 'completed', 'canceled']);

export const createProjectSchema = z
   .object({
      organizationSlug: organizationSlugSchema,
      teamKey: teamKeySchema,
      name: z.string().trim().min(1).max(160),
      status: projectStatusSchema.default('planned'),
      targetDate: z.string().date().nullable().optional(),
   })
   .strict();

export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export type ProjectLeadDto = {
   id: string;
   displayName: string;
   avatarUrl: string | null;
   timezone: string;
   joinedAt: string;
};

export type ProjectTeamDto = {
   id: string;
   key: string;
   name: string;
   color: string;
};

export type ProjectDto = {
   id: string;
   name: string;
   status: ProjectStatus;
   teamKey: string;
   createdAt: string;
   targetDate: string | null;
   lead: ProjectLeadDto | null;
};
