import type { DatabaseWithIssueMilestones } from '@/lib/supabase/database-with-issue-milestones';

type OrganizationRole = DatabaseWithIssueMilestones['public']['Enums']['organization_role'];
type Relationship = {
   foreignKeyName: string;
   columns: string[];
   isOneToOne: boolean;
   referencedRelation: string;
   referencedColumns: string[];
};

type OrganizationInvitationsTable = {
   Row: {
      id: string;
      organization_id: string;
      email: string;
      role: Exclude<OrganizationRole, 'owner'>;
      token_hash: string;
      invited_by: string;
      created_at: string;
      expires_at: string;
      accepted_at: string | null;
      revoked_at: string | null;
   };
   Insert: {
      id?: string;
      organization_id: string;
      email: string;
      role?: Exclude<OrganizationRole, 'owner'>;
      token_hash: string;
      invited_by: string;
      created_at?: string;
      expires_at: string;
      accepted_at?: string | null;
      revoked_at?: string | null;
   };
   Update: {
      token_hash?: string;
      expires_at?: string;
      revoked_at?: string | null;
   };
   Relationships: Relationship[];
};

type OrganizationInvitationTeamsTable = {
   Row: {
      invitation_id: string;
      organization_id: string;
      team_id: string;
      created_at: string;
   };
   Insert: {
      invitation_id: string;
      organization_id: string;
      team_id: string;
      created_at?: string;
   };
   Update: never;
   Relationships: Relationship[];
};

type InvitationFunctions = {
   create_organization_invitation: {
      Args: {
         p_organization_id: string;
         p_email: string;
         p_role: Exclude<OrganizationRole, 'owner'>;
         p_token_hash: string;
         p_expires_at: string;
         p_team_ids?: string[];
      };
      Returns: Array<{
         invitation_id: string;
         organization_id: string;
         email: string;
         role: Exclude<OrganizationRole, 'owner'>;
         invited_by: string;
         created_at: string;
         expires_at: string;
      }>;
   };
   revoke_organization_invitation: {
      Args: {
         p_invitation_id: string;
         p_organization_id: string;
      };
      Returns: Array<{
         invitation_id: string;
         revoked_at: string;
      }>;
   };
   reissue_organization_invitation: {
      Args: {
         p_invitation_id: string;
         p_organization_id: string;
         p_token_hash: string;
         p_expires_at: string;
      };
      Returns: Array<{
         invitation_id: string;
         email: string;
         role: Exclude<OrganizationRole, 'owner'>;
         expires_at: string;
      }>;
   };
   accept_organization_invitation: {
      Args: {
         p_token_hash: string;
      };
      Returns: Array<{
         organization_id: string;
         organization_slug: string;
         role: Exclude<OrganizationRole, 'owner'>;
         accepted_at: string;
      }>;
   };
};

export type DatabaseWithInvitations = Omit<DatabaseWithIssueMilestones, 'public'> & {
   public: Omit<DatabaseWithIssueMilestones['public'], 'Tables' | 'Functions'> & {
      Tables: DatabaseWithIssueMilestones['public']['Tables'] & {
         organization_invitations: OrganizationInvitationsTable;
         organization_invitation_teams: OrganizationInvitationTeamsTable;
      };
      Functions: DatabaseWithIssueMilestones['public']['Functions'] & InvitationFunctions;
   };
};
