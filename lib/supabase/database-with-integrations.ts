import type { DatabaseWithInvitations } from '@/lib/supabase/database-with-invitations';

type Relationship = {
   foreignKeyName: string;
   columns: string[];
   isOneToOne: boolean;
   referencedRelation: string;
   referencedColumns: string[];
};

type IntegrationConnectionsTable = {
   Row: {
      id: string;
      organization_id: string;
      owner_user_id: string | null;
      provider: string;
      connection_scope: 'organization' | 'user';
      status: 'pending' | 'connected' | 'degraded' | 'revoked';
      external_account_id: string | null;
      external_account_label: string | null;
      scopes: string[];
      connected_at: string | null;
      last_verified_at: string | null;
      disconnected_at: string | null;
      last_error_code: string | null;
      created_at: string;
      updated_at: string;
   };
   Insert: {
      id?: string;
      organization_id: string;
      owner_user_id?: string | null;
      provider: string;
      connection_scope: 'organization' | 'user';
      status?: 'pending' | 'connected' | 'degraded' | 'revoked';
      external_account_id?: string | null;
      external_account_label?: string | null;
      scopes?: string[];
      connected_at?: string | null;
      last_verified_at?: string | null;
      disconnected_at?: string | null;
      last_error_code?: string | null;
      created_at?: string;
      updated_at?: string;
   };
   Update: {
      status?: 'pending' | 'connected' | 'degraded' | 'revoked';
      external_account_id?: string | null;
      external_account_label?: string | null;
      scopes?: string[];
      connected_at?: string | null;
      last_verified_at?: string | null;
      disconnected_at?: string | null;
      last_error_code?: string | null;
      updated_at?: string;
   };
   Relationships: Relationship[];
};

export type DatabaseWithIntegrations = Omit<DatabaseWithInvitations, 'public'> & {
   public: Omit<DatabaseWithInvitations['public'], 'Tables'> & {
      Tables: DatabaseWithInvitations['public']['Tables'] & {
         integration_connections: IntegrationConnectionsTable;
      };
   };
};
