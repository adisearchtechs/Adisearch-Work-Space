import { z } from 'zod';
import { issuePrioritySchema } from '@/lib/issues/contracts';

export const savedViewTypeSchema = z.enum(['issue', 'project']);
export const savedViewStatusCategorySchema = z.enum([
   'triage',
   'backlog',
   'unstarted',
   'started',
   'completed',
   'canceled',
]);

const statusSlugSchema = z.string().min(1).max(48).regex(/^[a-z0-9-]+$/);

export const savedViewFilterSchema = z
   .object({
      statusCategories: z.array(savedViewStatusCategorySchema).max(6).optional(),
      statusIds: z.array(statusSlugSchema).max(20).optional(),
      priorityIds: z.array(issuePrioritySchema).max(5).optional(),
      hasProject: z.boolean().optional(),
   })
   .strict();

export function hasIssueOnlySavedViewFilter(filter: z.infer<typeof savedViewFilterSchema>) {
   return (
      filter.statusIds !== undefined ||
      filter.priorityIds !== undefined ||
      filter.hasProject !== undefined
   );
}

const savedViewNameSchema = z.string().trim().min(1).max(160);
const savedViewDescriptionSchema = z.string().max(1000);
const savedViewIconSchema = z.string().trim().min(1).max(16);

export const createSavedViewSchema = z
   .object({
      name: savedViewNameSchema,
      description: savedViewDescriptionSchema.default(''),
      icon: savedViewIconSchema.default('👁️'),
      viewType: savedViewTypeSchema,
      teamId: z.string().uuid().nullable().optional(),
      filter: savedViewFilterSchema.default({}),
   })
   .strict()
   .superRefine((value, context) => {
      if (value.viewType === 'project' && hasIssueOnlySavedViewFilter(value.filter)) {
         context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['filter'],
            message: 'Issue-only filters are not supported by project views.',
         });
      }
   });

export const updateSavedViewSchema = z
   .object({
      name: savedViewNameSchema.optional(),
      description: savedViewDescriptionSchema.optional(),
      icon: savedViewIconSchema.optional(),
      filter: savedViewFilterSchema.optional(),
   })
   .strict()
   .refine(
      (value) =>
         value.name !== undefined ||
         value.description !== undefined ||
         value.icon !== undefined ||
         value.filter !== undefined,
      'At least one saved-view field is required.'
   );

export type SavedViewFilter = z.infer<typeof savedViewFilterSchema>;
export type SavedViewType = z.infer<typeof savedViewTypeSchema>;

export type SavedViewDto = {
   id: string;
   name: string;
   description: string;
   icon: string;
   viewType: SavedViewType;
   teamId: string | null;
   owner: {
      id: string;
      displayName: string;
      avatarUrl: string | null;
   };
   filter: SavedViewFilter;
   createdAt: string;
   updatedAt: string;
   canManage: boolean;
};
