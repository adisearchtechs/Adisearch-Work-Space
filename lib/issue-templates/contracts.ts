import { z } from 'zod';

const name = z.string().trim().min(1).max(80);
const description = z.string().trim().max(500);
const title = z.string().trim().max(200);
const body = z.string().max(10000);

export const createIssueTemplateSchema = z
   .object({
      name,
      description: description.default(''),
      title: title.default(''),
      body: body.default(''),
   })
   .strict();

export const updateIssueTemplateSchema = z
   .object({
      name: name.optional(),
      description: description.optional(),
      title: title.optional(),
      body: body.optional(),
      active: z.boolean().optional(),
   })
   .strict()
   .refine((value) => Object.values(value).some((item) => item !== undefined), {
      message: 'At least one template field is required.',
   });

export const reorderIssueTemplatesSchema = z
   .object({ orderedTemplateIds: z.array(z.string().uuid()).min(1).max(100) })
   .strict()
   .refine(
      ({ orderedTemplateIds }) => new Set(orderedTemplateIds).size === orderedTemplateIds.length,
      {
         message: 'Template ids must be unique.',
      }
   );

export type IssueTemplateDto = {
   id: string;
   name: string;
   description: string;
   title: string;
   body: string;
   active: boolean;
   position: number;
   createdAt: string;
   updatedAt: string;
};
