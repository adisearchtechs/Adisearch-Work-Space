import type { Database } from '@/lib/supabase/database.types';

type IssueSubscriptionsTable = {
   Row: {
      issue_id: string;
      user_id: string;
      organization_id: string;
      created_at: string;
   };
   Insert: {
      issue_id: string;
      user_id: string;
      organization_id: string;
      created_at?: string;
   };
   Update: {
      issue_id?: string;
      user_id?: string;
      organization_id?: string;
      created_at?: string;
   };
   Relationships: [
      {
         foreignKeyName: 'issue_subscriptions_issue_organization_fkey';
         columns: ['issue_id', 'organization_id'];
         isOneToOne: false;
         referencedRelation: 'issues';
         referencedColumns: ['id', 'organization_id'];
      },
      {
         foreignKeyName: 'issue_subscriptions_user_organization_fkey';
         columns: ['user_id', 'organization_id'];
         isOneToOne: false;
         referencedRelation: 'organization_members';
         referencedColumns: ['user_id', 'organization_id'];
      },
   ];
};

export type DatabaseWithIssueSubscriptions = Omit<Database, 'public'> & {
   public: Omit<Database['public'], 'Tables'> & {
      Tables: Database['public']['Tables'] & {
         issue_subscriptions: IssueSubscriptionsTable;
      };
   };
};
