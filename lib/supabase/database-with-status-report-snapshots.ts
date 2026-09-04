import type { Json } from '@/lib/supabase/database.types';
import type { DatabaseWithPreferences } from '@/lib/supabase/database-with-preferences';

type StatusReportSnapshotsTable = {
   Row: {
      id: string;
      organization_id: string;
      scope: 'workspace' | 'team';
      team_id: string | null;
      created_by: string;
      schema_version: number;
      generated_at: string;
      payload: Json;
      created_at: string;
   };
   Insert: {
      id?: string;
      organization_id: string;
      scope: 'workspace' | 'team';
      team_id?: string | null;
      created_by: string;
      schema_version?: number;
      generated_at: string;
      payload: Json;
      created_at?: string;
   };
   Update: Partial<StatusReportSnapshotsTable['Insert']>;
   Relationships: [
      {
         foreignKeyName: 'status_report_snapshots_organization_id_fkey';
         columns: ['organization_id'];
         isOneToOne: false;
         referencedRelation: 'organizations';
         referencedColumns: ['id'];
      },
      {
         foreignKeyName: 'status_report_snapshots_team_org_fkey';
         columns: ['team_id', 'organization_id'];
         isOneToOne: false;
         referencedRelation: 'teams';
         referencedColumns: ['id', 'organization_id'];
      },
      {
         foreignKeyName: 'status_report_snapshots_created_by_fkey';
         columns: ['created_by'];
         isOneToOne: false;
         referencedRelation: 'profiles';
         referencedColumns: ['id'];
      },
   ];
};

export type DatabaseWithStatusReportSnapshots = Omit<DatabaseWithPreferences, 'public'> & {
   public: Omit<DatabaseWithPreferences['public'], 'Tables'> & {
      Tables: DatabaseWithPreferences['public']['Tables'] & {
         status_report_snapshots: StatusReportSnapshotsTable;
      };
   };
};
