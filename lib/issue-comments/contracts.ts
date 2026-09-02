export const MAX_ISSUE_COMMENT_CHARS = 10000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface IssueCommentDto {
   id: string;
   body: string;
   createdAt: string;
   author: {
      id: string | null;
      displayName: string;
      avatarUrl: string | null;
   };
}

export function isIssueCommentUuid(value: string) {
   return UUID.test(value);
}

export function parseIssueCommentBody(value: unknown) {
   if (!value || typeof value !== 'object') return null;
   const record = value as Record<string, unknown>;
   if (typeof record.issueId !== 'string' || !isIssueCommentUuid(record.issueId)) return null;
   if (typeof record.body !== 'string') return null;
   const body = record.body.trim();
   if (body.length < 1 || body.length > MAX_ISSUE_COMMENT_CHARS) return null;
   return { issueId: record.issueId, body };
}
