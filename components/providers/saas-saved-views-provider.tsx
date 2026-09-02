'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import type { SavedViewDto } from '@/lib/views/contracts';
import { useSavedViewsStore } from '@/store/saved-views-store';
import { useWorkspace } from '@/components/providers/workspace-provider';

export function SaasSavedViewsProvider({ children }: { children: React.ReactNode }) {
   const workspace = useWorkspace();
   const pathname = usePathname();

   useEffect(() => {
      if (!workspace.configured) return;
      const controller = new AbortController();
      useSavedViewsStore.getState().beginLoad(workspace.organization.slug);

      void fetch(`/api/views?organization=${encodeURIComponent(workspace.organization.slug)}`, {
         credentials: 'same-origin',
         signal: controller.signal,
         headers: { Accept: 'application/json' },
      })
         .then(async (response) => {
            if (!response.ok) throw new Error(`Saved-view load failed with ${response.status}.`);
            return (await response.json()) as { views: SavedViewDto[]; canWrite: boolean };
         })
         .then(({ views, canWrite }) => {
            if (controller.signal.aborted) return;
            useSavedViewsStore.getState().replaceViews(workspace.organization.slug, views, canWrite);
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            useSavedViewsStore.getState().clearViews();
            toast.error('Unable to load saved views.');
         });

      return () => controller.abort();
   }, [pathname, workspace.configured, workspace.organization.slug]);

   useEffect(() => {
      if (workspace.configured) return;
      useSavedViewsStore.getState().clearViews();
   }, [workspace.configured]);

   return children;
}
