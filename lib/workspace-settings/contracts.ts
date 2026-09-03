import { z } from 'zod';

export const workspaceSettingsPatchSchema = z
   .object({
      name: z.string().trim().min(2).max(100),
   })
   .strict();

export type WorkspaceSettingsDto = {
   id: string;
   name: string;
   slug: string;
};
