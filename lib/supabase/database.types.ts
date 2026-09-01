export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

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

type Timestamped = {
   created_at: string;
   updated_at: string;
};

export type Database = {
   public: {
      Tables: {
         profiles: Table<
            Timestamped & { id: string; display_name: string | null; avatar_url: string | null; timezone: string },
            { id: string; display_name?: string | null; avatar_url?: string | null; timezone?: string; created_at?: string; updated_at?: string }
         >;
         organizations: Table<
            Timestamped & { id: string; name: string; slug: string; created_by: string },
            { id?: string; name: string; slug: string; created_by: string; created_at?: string; updated_at?: string }
         >;
         organization_members: Table<
            { organization_id: string; user_id: string; role: Database['public']['Enums']['organization_role']; created_at: string },
            { organization_id: string; user_id: string; role?: Database['public']['Enums']['organization_role']; created_at?: string }
         >;
         teams: Table<
            Timestamped & { id: string; organization_id: string; name: string; key: string; issue_prefix: string; color: string; next_issue_number: number },
            { id?: string; organization_id: string; name: string; key: string; issue_prefix: string; color?: string; next_issue_number?: number; created_at?: string; updated_at?: string }
         >;
         team_members: Table<
            { team_id: string; organization_id: string; user_id: string; created_at: string },
            { team_id: string; organization_id: string; user_id: string; created_at?: string }
         >;
         statuses: Table<
            Timestamped & { id: string; organization_id: string; name: string; slug: string; category: Database['public']['Enums']['status_category']; color: string; position: number },
            { id?: string; organization_id: string; name: string; slug: string; category: Database['public']['Enums']['status_category']; color: string; position?: number; created_at?: string; updated_at?: string }
         >;
         projects: Table<
            Timestamped & { id: string; organization_id: string; team_id: string; name: string; description: string; status: string; lead_id: string | null; target_date: string | null },
            { id?: string; organization_id: string; team_id: string; name: string; description?: string; status?: string; lead_id?: string | null; target_date?: string | null; created_at?: string; updated_at?: string }
         >;
         project_updates: Table<
            { id: string; organization_id: string; project_id: string; author_id: string | null; kind: 'update' | 'comment'; health: 'on-track' | 'at-risk' | 'off-track' | null; body: string; created_at: string },
            { id?: string; organization_id: string; project_id: string; author_id?: string | null; kind?: 'update' | 'comment'; health?: 'on-track' | 'at-risk' | 'off-track' | null; body: string; created_at?: string }
         >;
         project_milestones: Table<
            { id: string; organization_id: string; project_id: string; created_by: string | null; name: string; target_date: string | null; completed: boolean; position: number; created_at: string },
            { id?: string; organization_id: string; project_id: string; created_by?: string | null; name: string; target_date?: string | null; completed?: boolean; position?: number; created_at?: string }
         >;
         project_resources: Table<
            { id: string; organization_id: string; project_id: string; created_by: string | null; label: string; url: string; position: number; created_at: string },
            { id?: string; organization_id: string; project_id: string; created_by?: string | null; label: string; url: string; position?: number; created_at?: string }
         >;
         project_labels: Table<
            { project_id: string; label_id: string; organization_id: string; created_at: string },
            { project_id: string; label_id: string; organization_id: string; created_at?: string }
         >;
         cycles: Table<
            Timestamped & { id: string; organization_id: string; team_id: string; name: string; starts_at: string; ends_at: string },
            { id?: string; organization_id: string; team_id: string; name: string; starts_at: string; ends_at: string; created_at?: string; updated_at?: string }
         >;
         labels: Table<
            Timestamped & { id: string; organization_id: string; name: string; color: string },
            { id?: string; organization_id: string; name: string; color: string; created_at?: string; updated_at?: string }
         >;
         issues: Table<
            Timestamped & { id: string; organization_id: string; team_id: string; issue_number: number; title: string; description: string; status_id: string; priority: Database['public']['Enums']['issue_priority']; assignee_id: string | null; project_id: string | null; cycle_id: string | null; creator_id: string; rank: string; due_date: string | null },
            { id?: string; organization_id: string; team_id: string; issue_number?: number; title: string; description?: string; status_id: string; priority?: Database['public']['Enums']['issue_priority']; assignee_id?: string | null; project_id?: string | null; cycle_id?: string | null; creator_id: string; rank?: string; due_date?: string | null; created_at?: string; updated_at?: string }
         >;
         issue_labels: Table<
            { issue_id: string; label_id: string; organization_id: string; created_at: string },
            { issue_id: string; label_id: string; organization_id: string; created_at?: string }
         >;
      };
      Views: Record<never, never>;
      Functions: Record<never, never>;
      Enums: {
         organization_role: 'owner' | 'admin' | 'member' | 'guest';
         status_category: 'triage' | 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled';
         issue_priority: 'no-priority' | 'urgent' | 'high' | 'medium' | 'low';
      };
      CompositeTypes: Record<never, never>;
   };
};
