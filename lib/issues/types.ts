import type { Issue } from '@/mock-data/issues';

export type WorkspaceIssue = Issue & {
   creatorId?: string;
   updatedAt?: string;
   milestoneId?: string | null;
};
