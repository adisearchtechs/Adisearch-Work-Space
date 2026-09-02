import type { Json } from '@/lib/supabase/database.types';
import type { DatabaseWithIssueRelations } from '@/lib/supabase/database-with-issue-relations';

export type IssueAuditEventType =
   | 'created'
   | 'title_changed'
   | 'description_changed'
   | 'status_changed'
   | 'priority_changed'
   | 'assignee_changed'
   | 'project_changed'
   | 'cycle_changed'
   | 'due_date_changed'
   | 'relation_added'
   | 'relation_removed';

type IssueAuditEventsTable = {
   Row: {
      id: string;
      organization_id: string;
      issue_id: string;
      actor_id: string | null;
      actor_display_name: string;
      event_type: IssueAuditEventType;
      details: Json;
      created_at: string;
   };
   Insert: {
      id?: string;
      organization_id: string;
      issue_id: string;
      actor_id?: string | null;
      actor_display_name: string;
      event_type: IssueAuditEventType;
      details?: Json;
      created_at?: string;
   };
   Update: Partial<IssueAuditEventsTable['Insert']>;
   Relationships: [
      {
         foreignKeyName: 'issue_audit_events_organization_id_fkey';
         columns: ['organization_id'];
         isOneToOne: false;
         referencedRelation: 'organizations';
         referencedColumns: ['id'];
      },
      {
         foreignKeyName: 'issue_audit_events_issue_organization_fkey';
         columns: ['issue_id', 'organization_id'];
         isOneToOne: false;
         referencedRelation: 'issues';
         referencedColumns: ['id', 'organization_id'];
      },
      {
         foreignKeyName: 'issue_audit_events_actor_organization_fkey';
         columns: ['actor_id', 'organization_id'];
         isOneToOne: false;
         referencedRelation: 'organization_members';
         referencedColumns: ['user_id', 'organization_id'];
      },
   ];
};

export type DatabaseWithIssueAuditActivity = Omit<DatabaseWithIssueRelations, 'public'> & {
   public: Omit<DatabaseWithIssueRelations['public'], 'Tables'> & {
      Tables: DatabaseWithIssueRelations['public']['Tables'] & {
         issue_audit_events: IssueAuditEventsTable;
      };
   };
};
