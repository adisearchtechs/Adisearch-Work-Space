import { z } from 'zod';

export const initiativeUpdateKindSchema = z.enum(['update', 'comment']);
export const initiativeUpdateHealthSchema = z.enum(['on-track', 'at-risk', 'off-track']);

export const createInitiativeUpdateSchema = z
   .object({
      kind: initiativeUpdateKindSchema,
      health: initiativeUpdateHealthSchema.nullable().optional(),
      body: z.string().trim().min(1).max(10000),
   })
   .strict()
   .superRefine((value, context) => {
      if (value.kind === 'update' && !value.health) {
         context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['health'],
            message: 'Initiative updates require a health status.',
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

export type InitiativeUpdateKind = z.infer<typeof initiativeUpdateKindSchema>;
export type InitiativeUpdateHealth = z.infer<typeof initiativeUpdateHealthSchema>;
export type CreateInitiativeUpdateInput = z.infer<typeof createInitiativeUpdateSchema>;

export type InitiativeUpdateAuthorDto = {
   id: string | null;
   displayName: string;
   avatarUrl: string | null;
};

export type InitiativeUpdateDto = {
   id: string;
   initiativeId: string;
   kind: InitiativeUpdateKind;
   health: InitiativeUpdateHealth | null;
   body: string;
   createdAt: string;
   author: InitiativeUpdateAuthorDto;
};
