'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWorkspace } from '@/components/providers/workspace-provider';
import type {
   IntegrationConnectionDto,
   IntegrationConnectionsResponse,
   IntegrationProviders,
} from '@/lib/integrations/contracts';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

const STATUS_RANK: Record<IntegrationConnectionDto['status'], number> = {
   connected: 4,
   degraded: 3,
   pending: 2,
   revoked: 1,
};

const unavailableProviders = (reason: string): IntegrationProviders => ({
   github: { available: false, reason },
});

export function useIntegrationConnections() {
   const workspace = useWorkspace();
   const [connections, setConnections] = useState<IntegrationConnectionDto[]>([]);
   const [providers, setProviders] = useState<IntegrationProviders>(() =>
      unavailableProviders('Checking GitHub App availability…')
   );
   const [state, setState] = useState<LoadState>('idle');
   const [error, setError] = useState<string | null>(null);
   const [refreshVersion, setRefreshVersion] = useState(0);
   const refresh = useCallback(() => setRefreshVersion((version) => version + 1), []);

   useEffect(() => {
      if (!workspace.configured) {
         setConnections([]);
         setProviders(unavailableProviders('External provider connections are unavailable in demo mode.'));
         setState('idle');
         setError(null);
         return;
      }

      const controller = new AbortController();
      setState('loading');
      setError(null);
      const endpoint = `/api/integrations?organization=${encodeURIComponent(workspace.organization.slug)}`;

      void fetch(endpoint, {
         credentials: 'same-origin',
         signal: controller.signal,
         headers: { Accept: 'application/json' },
         cache: 'no-store',
      })
         .then(async (response) => {
            const payload = (await response.json().catch(() => ({}))) as
               | IntegrationConnectionsResponse
               | { error?: string };
            if (!response.ok) {
               const message = 'error' in payload && payload.error
                  ? payload.error
                  : 'Unable to load integration connections.';
               throw new Error(message);
            }
            return payload as IntegrationConnectionsResponse;
         })
         .then((payload) => {
            if (controller.signal.aborted) return;
            setConnections(payload.connections);
            setProviders(payload.providers);
            setState('ready');
         })
         .catch((loadError: unknown) => {
            if (loadError instanceof DOMException && loadError.name === 'AbortError') return;
            if (controller.signal.aborted) return;
            setConnections([]);
            const message =
               loadError instanceof Error
                  ? loadError.message
                  : 'Unable to load integration connections.';
            setProviders(unavailableProviders(message));
            setState('error');
            setError(message);
         });

      return () => controller.abort();
   }, [workspace.configured, workspace.organization.slug, refreshVersion]);

   const primaryByProvider = useMemo(() => {
      const result = new Map<string, IntegrationConnectionDto>();
      for (const connection of connections) {
         const current = result.get(connection.provider);
         if (!current || STATUS_RANK[connection.status] > STATUS_RANK[current.status]) {
            result.set(connection.provider, connection);
         }
      }
      return result;
   }, [connections]);

   return {
      connections,
      providers,
      primaryByProvider,
      state,
      error,
      configured: workspace.configured,
      workspace,
      refresh,
   };
}
