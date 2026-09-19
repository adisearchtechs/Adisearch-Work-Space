import { z } from 'zod';
import type { Database } from '@/lib/supabase/database.types';

export type WorkspaceStatusCategory = Database['public']['Enums']['status_category'];

export const WORKSPACE_STATUS_CATEGORIES = [
   'triage',
   'backlog',
   'unstarted',
   'started',
   'completed',
   'canceled',
] as const satisfies readonly WorkspaceStatusCategory[];

const statusNameSchema = z.string().trim().min(1).max(60);
const statusColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Use a six-digit hex color.');
const statusCategorySchema = z.enum(WORKSPACE_STATUS_CATEGORIES);

export const createWorkspaceStatusSchema = z
   .object({
      name: statusNameSchema,
      color: statusColorSchema,
      category: statusCategorySchema,
   })
   .strict();

export const updateWorkspaceStatusSchema = z
   .object({
      name: statusNameSchema.optional(),
      color: statusColorSchema.optional(),
      category: statusCategorySchema.optional(),
   })
   .strict()
   .refine(
      (value) =>
         value.name !== undefined || value.color !== undefined || value.category !== undefined,
      { message: 'At least one status field is required.' }
   );

export const reorderWorkspaceStatusesSchema = z
   .object({
      orderedStatusIds: z.array(z.string().uuid()).min(1).max(100),
   })
   .strict()
   .refine(
      ({ orderedStatusIds }) => new Set(orderedStatusIds).size === orderedStatusIds.length,
      { message: 'Status ids must be unique.' }
   );

export type CreateWorkspaceStatusInput = z.infer<typeof createWorkspaceStatusSchema>;
export type UpdateWorkspaceStatusInput = z.infer<typeof updateWorkspaceStatusSchema>;
export type ReorderWorkspaceStatusesInput = z.infer<typeof reorderWorkspaceStatusesSchema>;

export type WorkspaceStatusDto = {
   id: string;
   name: string;
   slug: string;
   color: string;
   category: WorkspaceStatusCategory;
   position: number;
};
