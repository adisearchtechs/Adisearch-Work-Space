'use client';

import { Input } from '@/components/ui/input';
import type { IntegrationConnectionDto } from '@/lib/integrations/contracts';
import { ChevronRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { INTEGRATION_LOGOS } from './integration-logos';
import { INTEGRATION_CATEGORIES, INTEGRATIONS, type Integration } from './integrations-data';
import { useIntegrationConnections } from './use-integration-connections';

const VISIBLE_PER_CATEGORY = 8;

function IntegrationIcon({ integration, size = 36 }: { integration: Integration; size?: number }) {
   const Logo = INTEGRATION_LOGOS[integration.id];
   if (Logo) {
      return (
         <span
            className="rounded-md border bg-background inline-flex items-center justify-center shrink-0"
            style={{ width: size, height: size }}
            aria-hidden
         >
            <Logo className="size-[60%]" />
         </span>
      );
   }
   const initials = integration.name
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase();
   return (
      <span
         className="rounded-md inline-flex items-center justify-center font-semibold text-white shrink-0 select-none"
         style={{ width: size, height: size, backgroundColor: integration.color, fontSize: size * 0.34 }}
         aria-hidden
      >
         {initials}
      </span>
   );
}

function connectionLabel(connection: IntegrationConnectionDto | undefined) {
   if (!connection) return 'Not connected';
   if (connection.status === 'connected') return 'Connected';
   if (connection.status === 'degraded') return 'Needs attention';
   if (connection.status === 'pending') return 'Pending';
   return 'Disconnected';
}

function IntegrationCard({
   integration,
   connection,
}: {
   integration: Integration;
   connection?: IntegrationConnectionDto;
}) {
   return (
      <div className="flex items-start gap-3 rounded-lg border bg-container p-3 text-left">
         <IntegrationIcon integration={integration} />
         <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-2">
               <span className="text-sm font-medium truncate">{integration.name}</span>
               <span className="text-[11px] text-muted-foreground border rounded px-1 py-px leading-none shrink-0">
                  {connectionLabel(connection)}
               </span>
            </div>
            <span className="text-xs text-muted-foreground line-clamp-2">
               {integration.description}
            </span>
            {connection?.accountLabel && (
               <span className="mt-1 text-[11px] text-muted-foreground truncate">
                  Account: {connection.accountLabel}
               </span>
            )}
         </div>
      </div>
   );
}

function CategorySection({
   label,
   items,
   primaryByProvider,
}: {
   label: string;
   items: Integration[];
   primaryByProvider: Map<string, IntegrationConnectionDto>;
}) {
   const [expanded, setExpanded] = useState(false);
   const visible = expanded ? items : items.slice(0, VISIBLE_PER_CATEGORY);
   return (
      <section className="flex flex-col gap-3">
         <h2 className="text-base font-medium">{label}</h2>
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {visible.map((integration) => (
               <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  connection={primaryByProvider.get(integration.id)}
               />
            ))}
         </div>
         {!expanded && items.length > VISIBLE_PER_CATEGORY && (
            <button
               type="button"
               onClick={() => setExpanded(true)}
               className="self-start text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
               Show all
               <ChevronRight className="size-3" />
            </button>
         )}
      </section>
   );
}

export default function Integrations() {
   const [query, setQuery] = useState('');
   const { primaryByProvider, state, error, configured } = useIntegrationConnections();
   const searchResults = useMemo(() => {
      const needle = query.trim().toLowerCase();
      if (!needle) return null;
      return Object.values(INTEGRATIONS).filter(
         (integration) =>
            integration.name.toLowerCase().includes(needle) ||
            integration.description.toLowerCase().includes(needle)
      );
   }, [query]);

   const stateMessage = !configured
      ? 'This demo workspace has no authoritative external connection state.'
      : state === 'loading'
        ? 'Checking persisted workspace connection state…'
        : state === 'error'
          ? error ?? 'Integration connection state could not be loaded.'
          : 'Connection labels below come from persisted workspace metadata. OAuth setup and disconnect flows are not released in R5A.';

   return (
      <div className="w-full overflow-y-auto h-full">
         <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-8">
            <div className="flex flex-col gap-1">
               <h1 className="text-2xl font-medium">Integrations</h1>
               <p className="text-sm text-muted-foreground">
                  Browse providers and inspect server-authoritative connection state.
               </p>
            </div>

            <div className="rounded-lg border bg-container px-4 py-3 text-sm text-muted-foreground" role="status">
               {stateMessage}
            </div>

            <div className="relative">
               <Search className="size-4 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
               <Input
                  placeholder="Search integrations"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="pl-8 h-9"
               />
            </div>

            {searchResults ? (
               <section className="flex flex-col gap-3">
                  <h2 className="text-base font-medium">
                     {searchResults.length} result{searchResults.length === 1 ? '' : 's'}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                     {searchResults.map((integration) => (
                        <IntegrationCard
                           key={integration.id}
                           integration={integration}
                           connection={primaryByProvider.get(integration.id)}
                        />
                     ))}
                  </div>
               </section>
            ) : (
               INTEGRATION_CATEGORIES.map((category) => (
                  <CategorySection
                     key={category.id}
                     label={category.label}
                     items={category.items.map((id) => INTEGRATIONS[id])}
                     primaryByProvider={primaryByProvider}
                  />
               ))
            )}
         </div>
      </div>
   );
}
