import type { DatabaseWithIssueComments } from '@/lib/supabase/database-with-issue-comments';

type IssueRelationsTable = {
   Row: {
      id: string;
      organization_id: string;
      source_issue_id: string;
      target_issue_id: string;
      relation_type: 'parent' | 'blocks' | 'related';
      created_by: string | null;
      created_at: string;
   };
   Insert: {
      id?: string;
      organization_id: string;
      source_issue_id: string;
      target_issue_id: string;
      relation_type: 'parent' | 'blocks' | 'related';
      created_by?: string | null;
      created_at?: string;
   };
   Update: Partial<IssueRelationsTable['Insert']>;
   Relationships: [
      {
         foreignKeyName: 'issue_relations_organization_id_fkey';
         columns: ['organization_id'];
         isOneToOne: false;
         referencedRelation: 'organizations';
         referencedColumns: ['id'];
      },
      {
         foreignKeyName: 'issue_relations_source_organization_fkey';
         columns: ['source_issue_id', 'organization_id'];
         isOneToOne: false;
         referencedRelation: 'issues';
         referencedColumns: ['id', 'organization_id'];
      },
      {
         foreignKeyName: 'issue_relations_target_organization_fkey';
         columns: ['target_issue_id', 'organization_id'];
         isOneToOne: false;
         referencedRelation: 'issues';
         referencedColumns: ['id', 'organization_id'];
      },
      {
         foreignKeyName: 'issue_relations_creator_organization_fkey';
         columns: ['created_by', 'organization_id'];
         isOneToOne: false;
         referencedRelation: 'organization_members';
         referencedColumns: ['user_id', 'organization_id'];
      },
   ];
};

export type DatabaseWithIssueRelations = Omit<DatabaseWithIssueComments, 'public'> & {
   public: Omit<DatabaseWithIssueComments['public'], 'Tables'> & {
      Tables: DatabaseWithIssueComments['public']['Tables'] & {
         issue_relations: IssueRelationsTable;
      };
   };
};
