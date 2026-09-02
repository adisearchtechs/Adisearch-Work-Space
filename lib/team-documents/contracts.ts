import { z } from 'zod';

const teamDocumentTitleSchema = z.string().trim().min(1).max(160);
const teamDocumentBodySchema = z.string().max(50000);

export const createTeamDocumentSchema = z
   .object({
      title: teamDocumentTitleSchema,
      body: teamDocumentBodySchema.default(''),
      pinned: z.boolean().default(false),
   })
   .strict();

export const updateTeamDocumentSchema = z
   .object({
      title: teamDocumentTitleSchema.optional(),
      body: teamDocumentBodySchema.optional(),
      pinned: z.boolean().optional(),
   })
   .strict()
   .refine(
      (value) => value.title !== undefined || value.body !== undefined || value.pinned !== undefined,
      'At least one team document field is required.'
   );

export type TeamDocumentDto = {
   id: string;
   teamId: string;
   title: string;
   body: string;
   pinned: boolean;
   createdBy: string | null;
   createdAt: string;
   updatedAt: string;
};
