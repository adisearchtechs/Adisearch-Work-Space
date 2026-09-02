export const ISSUE_ACTIVITY_EVENT_TYPES = [
   'created',
   'title_changed',
   'description_changed',
   'status_changed',
   'priority_changed',
   'assignee_changed',
   'project_changed',
   'cycle_changed',
   'due_date_changed',
   'relation_added',
   'relation_removed',
] as const;

export type IssueActivityEventType = (typeof ISSUE_ACTIVITY_EVENT_TYPES)[number];

export type IssueActivityEventDto = {
   id: string;
   eventType: IssueActivityEventType;
   actor: {
      id: string | null;
      displayName: string;
      avatarUrl: string | null;
   };
   details: Record<string, unknown>;
   createdAt: string;
};
