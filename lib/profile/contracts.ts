import { z } from 'zod';

function isValidTimeZone(value: string) {
   try {
      new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
      return true;
   } catch {
      return false;
   }
}

export const profilePatchSchema = z
   .object({
      displayName: z.string().trim().min(1).max(120),
      timezone: z.string().trim().min(1).max(100).refine(isValidTimeZone, 'Invalid time zone'),
   })
   .strict();

export type ProfileSettingsDto = {
   displayName: string;
   avatarUrl: string | null;
   timezone: string;
};
