import { z } from 'zod';

export const projectUpdateKindSchema = z.enum(['update', 'comment']);
export const projectUpdateHealthSchema = z.enum(['on-track', 'at-risk', 'off-track']);

export const createProjectUpdateSchema = z
   .object({
      kind: projectUpdateKindSchema,
      health: projectUpdateHealthSchema.nullable().optional(),
      body: z.string().trim().min(1).max(10000),
   })
   .strict()
   .superRefine((value, context) => {
      if (value.kind === 'update' && !value.health) {
         context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['health'],
            message: 'Project updates require a health status.',
         });
      }
      if (value.kind === 'comment' && value.health != null) {
         context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['health'],
            message: 'Comments do not have a health status.',
         });
      }
   });

export type ProjectUpdateKind = z.infer<typeof projectUpdateKindSchema>;
export type ProjectUpdateHealth = z.infer<typeof projectUpdateHealthSchema>;
export type CreateProjectUpdateInput = z.infer<typeof createProjectUpdateSchema>;

export type ProjectUpdateAuthorDto = {
   id: string | null;
   displayName: string;
   avatarUrl: string | null;
};

export type ProjectUpdateDto = {
   id: string;
   projectId: string;
   kind: ProjectUpdateKind;
   health: ProjectUpdateHealth | null;
   body: string;
   createdAt: string;
   author: ProjectUpdateAuthorDto;
};
