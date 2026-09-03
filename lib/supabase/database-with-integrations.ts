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

type IntegrationAuthorizationStatesTable = {
   Row: {
      id: string;
      organization_id: string;
      actor_user_id: string;
      provider: 'github';
      state_hash: string;
      candidate_external_id: string | null;
      created_at: string;
      expires_at: string;
      consumed_at: string | null;
   };
   Insert: {
      id?: string;
      organization_id: string;
      actor_user_id: string;
      provider: 'github';
      state_hash: string;
      candidate_external_id?: string | null;
      created_at?: string;
      expires_at: string;
      consumed_at?: string | null;
   };
   Update: {
      candidate_external_id?: string | null;
      consumed_at?: string | null;
   };
   Relationships: Relationship[];
};

type IntegrationFunctions = {
   create_integration_authorization_state: {
      Args: {
         p_organization_id: string;
         p_provider: string;
         p_state_hash: string;
         p_expires_at: string;
      };
      Returns: Array<{
         authorization_id: string;
         expires_at: string;
      }>;
   };
   get_integration_authorization_state: {
      Args: {
         p_state_hash: string;
      };
      Returns: Array<{
         authorization_id: string;
         organization_id: string;
         provider: string;
         candidate_external_id: string | null;
         expires_at: string;
      }>;
   };
   record_integration_authorization_candidate: {
      Args: {
         p_state_hash: string;
         p_external_id: string;
      };
      Returns: Array<{
         authorization_id: string;
         organization_id: string;
         candidate_external_id: string;
      }>;
   };
   complete_github_integration_authorization: {
      Args: {
         p_state_hash: string;
         p_installation_id: string;
         p_account_label: string;
         p_scopes: string[];
      };
      Returns: Array<{
         connection_id: string;
         organization_id: string;
         status: string;
         external_account_id: string;
         external_account_label: string;
         connected_at: string;
      }>;
   };
};

export type DatabaseWithIntegrations = Omit<DatabaseWithInvitations, 'public'> & {
   public: Omit<DatabaseWithInvitations['public'], 'Tables' | 'Functions'> & {
      Tables: DatabaseWithInvitations['public']['Tables'] & {
         integration_connections: IntegrationConnectionsTable;
         integration_authorization_states: IntegrationAuthorizationStatesTable;
      };
      Functions: DatabaseWithInvitations['public']['Functions'] & IntegrationFunctions;
   };
};
