export type IntegrationConnectionScope = 'organization' | 'user';
export type IntegrationConnectionStatus = 'pending' | 'connected' | 'degraded' | 'revoked';

export type IntegrationConnectionDto = {
   id: string;
   provider: string;
   scope: IntegrationConnectionScope;
   status: IntegrationConnectionStatus;
   accountId: string | null;
   accountLabel: string | null;
   scopes: string[];
   connectedAt: string | null;
   lastVerifiedAt: string | null;
   disconnectedAt: string | null;
   lastErrorCode: string | null;
};

export type IntegrationProviderReadiness = {
   available: boolean;
   reason: string | null;
};

export type IntegrationProviders = {
   github: IntegrationProviderReadiness;
};

export type IntegrationConnectionsResponse = {
   connections: IntegrationConnectionDto[];
   providers: IntegrationProviders;
};

export function mapIntegrationConnection(row: {
   id: string;
   provider: string;
   connection_scope: IntegrationConnectionScope;
   status: IntegrationConnectionStatus;
   external_account_id: string | null;
   external_account_label: string | null;
   scopes: string[];
   connected_at: string | null;
   last_verified_at: string | null;
   disconnected_at: string | null;
   last_error_code: string | null;
}): IntegrationConnectionDto {
   return {
      id: row.id,
      provider: row.provider,
      scope: row.connection_scope,
      status: row.status,
      accountId: row.external_account_id,
      accountLabel: row.external_account_label,
      scopes: row.scopes,
      connectedAt: row.connected_at,
      lastVerifiedAt: row.last_verified_at,
      disconnectedAt: row.disconnected_at,
      lastErrorCode: row.last_error_code,
   };
}
