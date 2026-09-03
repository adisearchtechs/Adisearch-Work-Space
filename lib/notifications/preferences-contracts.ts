import { z } from 'zod';

export const notificationPreferencesSchema = z
   .object({
      issueAssignment: z.boolean(),
      issueStatus: z.boolean(),
   })
   .strict();

export type NotificationPreferencesDto = z.infer<typeof notificationPreferencesSchema>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferencesDto = {
   issueAssignment: true,
   issueStatus: true,
};
