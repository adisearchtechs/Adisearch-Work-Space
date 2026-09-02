import type { DatabaseWithIssueSubscriptions } from '@/lib/supabase/database-with-issue-subscriptions';

type Relationship = {
   foreignKeyName: string;
   columns: string[];
   isOneToOne: boolean;
   referencedRelation: string;
   referencedColumns: string[];
};

type Table<Row, Insert, Update = Partial<Insert>> = {
   Row: Row;
   Insert: Insert;
   Update: Update;
   Relationships: Relationship[];
};

type ReviewsTable = Table<
   {
      id: string;
      organization_id: string;
      created_by: string;
      issue_id: string | null;
      title: string;
      body: string;
      status: string;
      external_provider: string | null;
      external_url: string | null;
      repository: string | null;
      external_number: number | null;
      target_ref: string;
      source_ref: string;
      test_plan: string;
      checks_passed: number;
      checks_total: number;
      created_at: string;
      updated_at: string;
   },
   {
      id?: string;
      organization_id: string;
      created_by: string;
      issue_id?: string | null;
      title: string;
      body?: string;
      status?: string;
      external_provider?: string | null;
      external_url?: string | null;
      repository?: string | null;
      external_number?: number | null;
      target_ref?: string;
      source_ref?: string;
      test_plan?: string;
      checks_passed?: number;
      checks_total?: number;
      created_at?: string;
      updated_at?: string;
   }
>;

type ReviewReviewersTable = Table<
   {
      review_id: string;
      organization_id: string;
      user_id: string;
      assigned_by: string | null;
      verdict: string;
      assigned_at: string;
      responded_at: string | null;
   },
   {
      review_id: string;
      organization_id: string;
      user_id: string;
      assigned_by?: string | null;
      verdict?: string;
      assigned_at?: string;
      responded_at?: string | null;
   }
>;

type ReviewCommentsTable = Table<
   {
      id: string;
      organization_id: string;
      review_id: string;
      author_id: string | null;
      body: string;
      created_at: string;
      updated_at: string;
   },
   {
      id?: string;
      organization_id: string;
      review_id: string;
      author_id?: string | null;
      body: string;
      created_at?: string;
      updated_at?: string;
   }
>;

export type DatabaseWithReviews = Omit<DatabaseWithIssueSubscriptions, 'public'> & {
   public: Omit<DatabaseWithIssueSubscriptions['public'], 'Tables'> & {
      Tables: DatabaseWithIssueSubscriptions['public']['Tables'] & {
         reviews: ReviewsTable;
         review_reviewers: ReviewReviewersTable;
         review_comments: ReviewCommentsTable;
      };
   };
};
