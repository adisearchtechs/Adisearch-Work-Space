import { z } from 'zod';

const resourceUrlSchema = z
   .string()
   .trim()
   .min(1)
   .max(2048)
   .url()
   .refine((value) => {
      try {
         const protocol = new URL(value).protocol;
         return protocol === 'https:' || protocol === 'http:';
      } catch {
         return false;
      }
   }, 'Resource URL must use HTTP or HTTPS.');

export const createInitiativeResourceSchema = z
   .object({
      label: z.string().trim().min(1).max(120),
      url: resourceUrlSchema,
   })
   .strict();

export const updateInitiativeResourceSchema = z
   .object({
      label: z.string().trim().min(1).max(120).optional(),
      url: resourceUrlSchema.optional(),
   })
   .strict()
   .refine((value) => value.label !== undefined || value.url !== undefined, {
      message: 'At least one resource field is required.',
   });

export type InitiativeResourceDto = {
   id: string;
   initiativeId: string;
   label: string;
   url: string;
   position: number;
   createdAt: string;
};
