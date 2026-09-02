import { z } from 'zod';
import type { IssueDto } from '@/lib/issues/contracts';

export const notificationKindSchema = z.enum(['assignment', 'status']);
export const notificationReadSchema = z.object({ read: z.boolean() }).strict();

export type NotificationKind = z.infer<typeof notificationKindSchema>;

export type NotificationDto = {
   id: string;
   kind: NotificationKind;
   content: string;
   readAt: string | null;
   createdAt: string;
   actor: {
      id: string;
      displayName: string;
      avatarUrl: string | null;
   } | null;
   issue: {
      id: string;
      identifier: string;
      title: string;
      statusName: string;
      statusSlug: string;
      priorityId: IssueDto['priorityId'];
   } | null;
};
