import type { Issue } from '@/mock-data/issues';

export type WorkspaceIssue = Issue & {
   milestoneId?: string | null;
};
