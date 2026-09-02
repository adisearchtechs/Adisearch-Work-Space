import { z } from 'zod';

const labelNameSchema = z.string().trim().min(1).max(60);
const labelColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Use a six-digit hex color.');

export const createWorkspaceLabelSchema = z
   .object({
      name: labelNameSchema,
      color: labelColorSchema,
   })
   .strict();

export const updateWorkspaceLabelSchema = z
   .object({
      name: labelNameSchema.optional(),
      color: labelColorSchema.optional(),
   })
   .strict()
   .refine((value) => value.name !== undefined || value.color !== undefined, {
      message: 'At least one label field is required.',
   });

export type CreateWorkspaceLabelInput = z.infer<typeof createWorkspaceLabelSchema>;
export type UpdateWorkspaceLabelInput = z.infer<typeof updateWorkspaceLabelSchema>;

export type WorkspaceLabelUsage = {
   issues: number;
   projects: number;
   initiatives: number;
   total: number;
};

export type WorkspaceLabelDto = {
   id: string;
   name: string;
   color: string;
   createdAt: string;
   updatedAt: string;
   usage: WorkspaceLabelUsage;
};
