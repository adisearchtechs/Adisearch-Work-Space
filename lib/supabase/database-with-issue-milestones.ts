import type {
   DatabaseWithIssueAuditActivity,
   IssueAuditEventType,
} from '@/lib/supabase/database-with-issue-audit-activity';

type BaseIssuesTable = DatabaseWithIssueAuditActivity['public']['Tables']['issues'];
type BaseAuditTable = DatabaseWithIssueAuditActivity['public']['Tables']['issue_audit_events'];

type IssuesWithMilestonesTable = {
   Row: BaseIssuesTable['Row'] & { milestone_id: string | null };
   Insert: BaseIssuesTable['Insert'] & { milestone_id?: string | null };
   Update: BaseIssuesTable['Update'] & { milestone_id?: string | null };
   Relationships: BaseIssuesTable['Relationships'];
};

export type IssueAuditEventTypeWithMilestone = IssueAuditEventType | 'milestone_changed';

type IssueAuditEventsWithMilestonesTable = {
   Row: Omit<BaseAuditTable['Row'], 'event_type'> & {
      event_type: IssueAuditEventTypeWithMilestone;
   };
   Insert: Omit<BaseAuditTable['Insert'], 'event_type'> & {
      event_type: IssueAuditEventTypeWithMilestone;
   };
   Update: Omit<BaseAuditTable['Update'], 'event_type'> & {
      event_type?: IssueAuditEventTypeWithMilestone;
   };
   Relationships: BaseAuditTable['Relationships'];
};

export type DatabaseWithIssueMilestones = Omit<DatabaseWithIssueAuditActivity, 'public'> & {
   public: Omit<DatabaseWithIssueAuditActivity['public'], 'Tables'> & {
      Tables: Omit<
         DatabaseWithIssueAuditActivity['public']['Tables'],
         'issues' | 'issue_audit_events'
      > & {
         issues: IssuesWithMilestonesTable;
         issue_audit_events: IssueAuditEventsWithMilestonesTable;
      };
   };
};
