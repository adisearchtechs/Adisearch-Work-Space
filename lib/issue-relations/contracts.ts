import { z } from 'zod';

export const issueRelationKinds = ['parent', 'sub-issue', 'blocked-by', 'blocks', 'related'] as const;
export type IssueRelationKind = (typeof issueRelationKinds)[number];

export const createIssueRelationSchema = z.object({
   targetIssueId: z.string().uuid(),
   kind: z.enum(issueRelationKinds),
});

export type CreateIssueRelationInput = z.infer<typeof createIssueRelationSchema>;
