import { z } from 'zod';

export const profilePatchSchema = z
   .object({
      displayName: z.string().trim().min(1).max(120),
   })
   .strict();

export type ProfileSettingsDto = {
   displayName: string;
   avatarUrl: string | null;
};
