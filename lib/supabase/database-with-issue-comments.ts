import type { DatabaseWithAgent } from '@/lib/supabase/database-with-agent';

type IssueCommentsTable = {
   Row: {
      id: string;
      organization_id: string;
      issue_id: string;
      author_id: string | null;
      body: string;
      created_at: string;
   };
   Insert: {
      id?: string;
      organization_id: string;
      issue_id: string;
      author_id?: string | null;
      body: string;
      created_at?: string;
   };
   Update: Partial<IssueCommentsTable['Insert']>;
   Relationships: [
      {
         foreignKeyName: 'issue_comments_organization_id_fkey';
         columns: ['organization_id'];
         isOneToOne: false;
         referencedRelation: 'organizations';
         referencedColumns: ['id'];
      },
      {
         foreignKeyName: 'issue_comments_issue_organization_fkey';
         columns: ['issue_id', 'organization_id'];
         isOneToOne: false;
         referencedRelation: 'issues';
         referencedColumns: ['id', 'organization_id'];
      },
      {
         foreignKeyName: 'issue_comments_author_id_fkey';
         columns: ['author_id'];
         isOneToOne: false;
         referencedRelation: 'profiles';
         referencedColumns: ['id'];
      },
      {
         foreignKeyName: 'issue_comments_author_organization_fkey';
         columns: ['author_id', 'organization_id'];
         isOneToOne: false;
         referencedRelation: 'organization_members';
         referencedColumns: ['user_id', 'organization_id'];
      },
   ];
};

export type DatabaseWithIssueComments = Omit<DatabaseWithAgent, 'public'> & {
   public: Omit<DatabaseWithAgent['public'], 'Tables'> & {
      Tables: DatabaseWithAgent['public']['Tables'] & {
         issue_comments: IssueCommentsTable;
      };
   };
};
