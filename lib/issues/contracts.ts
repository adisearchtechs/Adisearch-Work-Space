import { z } from 'zod';

export const issuePrioritySchema = z.enum(['no-priority', 'urgent', 'high', 'medium', 'low']);

export const createIssueSchema = z
   .object({
      organizationSlug: z
         .string()
         .min(2)
         .max(48)
         .regex(/^[a-z0-9-]+$/),
      teamKey: z
         .string()
         .min(2)
         .max(10)
         .regex(/^[A-Z][A-Z0-9]+$/),
      title: z.string().trim().min(1).max(240),
      description: z.string().max(20000).default(''),
      statusSlug: z
         .string()
         .min(1)
         .max(48)
         .regex(/^[a-z0-9-]+$/),
      priority: issuePrioritySchema.default('no-priority'),
      projectId: z.string().uuid().nullable().optional(),
   })
   .strict();

export const updateIssueSchema = z
   .object({
      title: z.string().trim().min(1).max(240).optional(),
      description: z.string().max(20000).optional(),
      statusSlug: z
         .string()
         .min(1)
         .max(48)
         .regex(/^[a-z0-9-]+$/)
         .optional(),
      priority: issuePrioritySchema.optional(),
      dueDate: z.string().date().nullable().optional(),
      projectId: z.string().uuid().nullable().optional(),
   })
   .strict()
   .refine((value) => Object.keys(value).length > 0, 'No supported changes supplied.');

export type IssueDto = {
   id: string;
   identifier: string;
   title: string;
   description: string;
   statusId: string;
   priorityId: z.infer<typeof issuePrioritySchema>;
   createdAt: string;
   cycleId: string;
   rank: string;
   dueDate?: string;
   projectId: string | null;
};
