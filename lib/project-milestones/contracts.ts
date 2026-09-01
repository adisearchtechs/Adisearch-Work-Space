import { z } from 'zod';

const isoDateSchema = z
   .string()
   .regex(/^\d{4}-\d{2}-\d{2}$/)
   .refine((value) => {
      const parsed = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
   }, 'Invalid date.');

export const createProjectMilestoneSchema = z
   .object({
      name: z.string().trim().min(1).max(160),
      targetDate: isoDateSchema.nullable().optional(),
   })
   .strict();

export const updateProjectMilestoneSchema = z
   .object({
      name: z.string().trim().min(1).max(160).optional(),
      targetDate: isoDateSchema.nullable().optional(),
      completed: z.boolean().optional(),
   })
   .strict()
   .refine(
      (value) =>
         value.name !== undefined || value.targetDate !== undefined || value.completed !== undefined,
      'At least one milestone field is required.'
   );

export type CreateProjectMilestoneInput = z.infer<typeof createProjectMilestoneSchema>;
export type UpdateProjectMilestoneInput = z.infer<typeof updateProjectMilestoneSchema>;

export type ProjectMilestoneDto = {
   id: string;
   projectId: string;
   name: string;
   targetDate: string | null;
   completed: boolean;
   position: number;
   createdAt: string;
};
