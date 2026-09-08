'use client';

import { useEffect, useState, type FC } from 'react';
import { toast } from 'sonner';
import { useWorkspace } from '@/components/providers/workspace-provider';
import type { Status } from '@/mock-data/status';
import type {
   WorkspaceStatusCategory,
   WorkspaceStatusDto,
} from '@/lib/workspace-statuses/contracts';

function RuntimeStatusGlyph({
   category,
   color,
}: {
   category: WorkspaceStatusCategory;
   color: string;
}) {
   const filled = category === 'completed';
   const canceled = category === 'canceled';
   const active = category === 'started';

   return (
      <span
         aria-hidden="true"
         className="relative inline-flex size-3.5 shrink-0 items-center justify-center rounded-full border-[1.5px]"
         style={{
            borderColor: color,
            backgroundColor: filled ? color : 'transparent',
            color,
         }}
      >
         {active && (
            <span
               className="size-1.5 rounded-full"
               style={{ backgroundColor: color }}
            />
         )}
         {filled && (
            <span className="text-[9px] font-bold leading-none text-white">✓</span>
         )}
         {canceled && <span className="text-[9px] font-bold leading-none">×</span>}
      </span>
   );
}

function toRuntimeStatus(status: WorkspaceStatusDto): Status {
   const Icon: FC = () => (
      <RuntimeStatusGlyph category={status.category} color={status.color} />
   );

   return {
      id: status.id,
      name: status.name,
      color: status.color,
      category: status.category,
      icon: Icon,
   };
}

export function useWorkspaceStatuses() {
   const workspace = useWorkspace();
   const [statuses, setStatuses] = useState<Status[]>([]);
   const [loaded, setLoaded] = useState(!workspace.configured);
   const [loadError, setLoadError] = useState(false);

   useEffect(() => {
      if (!workspace.configured) {
         setStatuses([]);
         setLoaded(true);
         setLoadError(false);
         return;
      }

      const controller = new AbortController();
      setStatuses([]);
      setLoaded(false);
      setLoadError(false);

      void fetch(
         `/api/statuses?organization=${encodeURIComponent(workspace.organization.slug)}`,
         {
            credentials: 'same-origin',
            signal: controller.signal,
            headers: { Accept: 'application/json' },
         }
      )
         .then(async (response) => {
            if (!response.ok) {
               throw new Error(`Workspace status load failed with ${response.status}.`);
            }
            return (await response.json()) as { statuses: WorkspaceStatusDto[] };
         })
         .then(({ statuses: nextStatuses }) => {
            if (controller.signal.aborted) return;
            setStatuses(nextStatuses.map(toRuntimeStatus));
            setLoaded(true);
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            setStatuses([]);
            setLoadError(true);
            setLoaded(true);
            toast.error('Unable to load workspace statuses.');
         });

      return () => controller.abort();
   }, [workspace.configured, workspace.organization.slug]);

   return { statuses, loaded, loadError };
}
