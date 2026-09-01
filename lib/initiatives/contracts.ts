import { z } from 'zod';

export const initiativeStatusSchema = z.enum(['active', 'planned', 'completed']);
export const initiativeHealthSchema = z.enum(['no-update', 'on-track', 'at-risk', 'off-track']);
export const initiativePrioritySchema = z.enum(['no-priority', 'urgent', 'high', 'medium', 'low']);

const initiativeFields = {
   name: z.string().trim().min(1).max(160),
   description: z.string().max(20000),
   icon: z.string().trim().min(1).max(16),
   status: initiativeStatusSchema,
   priority: initiativePrioritySchema,
   target: z.string().trim().max(80).nullable(),
   health: initiativeHealthSchema,
};

export const createInitiativeSchema = z
   .object({
      name: initiativeFields.name,
      description: initiativeFields.description.optional(),
      icon: initiativeFields.icon.optional(),
      status: initiativeFields.status.optional(),
      priority: initiativeFields.priority.optional(),
      target: initiativeFields.target.optional(),
      health: initiativeFields.health.optional(),
   })
   .strict();

export const updateInitiativeSchema = z
   .object({
      name: initiativeFields.name.optional(),
      description: initiativeFields.description.optional(),
      icon: initiativeFields.icon.optional(),
      status: initiativeFields.status.optional(),
      priority: initiativeFields.priority.optional(),
      target: initiativeFields.target.optional(),
      health: initiativeFields.health.optional(),
   })
   .strict()
   .refine((value) => Object.values(value).some((field) => field !== undefined), {
      message: 'At least one initiative field is required.',
   });

export const assignInitiativeProjectSchema = z.object({ projectId: z.string().uuid() }).strict();

export type InitiativeStatus = z.infer<typeof initiativeStatusSchema>;
export type InitiativeHealth = z.infer<typeof initiativeHealthSchema>;
export type InitiativePriority = z.infer<typeof initiativePrioritySchema>;

export type InitiativeOwnerDto = {
   id: string;
   displayName: string;
   avatarUrl: string | null;
};

export type InitiativeDto = {
   id: string;
   name: string;
   description: string;
   icon: string;
   status: InitiativeStatus;
   priority: InitiativePriority;
   target: string | null;
   health: InitiativeHealth;
   owner: InitiativeOwnerDto | null;
   projectIds: string[];
   createdAt: string;
   updatedAt: string;
};
