'use client';

import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { useRightPanelStore } from '@/store/right-panel-store';
import { useSavedViewsStore } from '@/store/saved-views-store';
import { useTeamsStore } from '@/store/teams-store';
import { BarChart3, MoreHorizontal, Star, Trash2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

async function readError(response: Response, fallback: string) {
   try {
      const body = (await response.json()) as { error?: string };
      return body.error || fallback;
   } catch {
      return fallback;
   }
}

export default function PersistentViewHeader() {
   const workspace = useWorkspace();
   const { orgId, viewId } = useParams<{ orgId: string; viewId: string }>();
   const router = useRouter();
   const view = useSavedViewsStore((state) => state.views.find((item) => item.id === viewId));
   const removeView = useSavedViewsStore((state) => state.removeView);
   const teams = useTeamsStore((state) => state.teams);
   const { openPanel, togglePanel } = useRightPanelStore();
   const team = view?.teamId ? teams.find((candidate) => candidate.id === view.teamId) : undefined;

   if (!view) return null;

   const deleteView = async () => {
      if (!view.canManage) return;
      if (!window.confirm(`Delete saved view “${view.name}”?`)) return;
      try {
         const response = await fetch(
            `/api/views/${encodeURIComponent(view.id)}?organization=${encodeURIComponent(workspace.organization.slug)}`,
            { method: 'DELETE', credentials: 'same-origin' }
         );
         if (!response.ok) throw new Error(await readError(response, 'Unable to delete saved view.'));
         removeView(view.id);
         router.push(team ? `/${orgId}/team/${team.key}/views` : `/${orgId}/views`);
         toast.success('Saved view deleted.');
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to delete saved view.');
      }
   };

   return (
      <div className="w-full flex flex-col">
         <div className="w-full flex justify-between items-center border-b py-1.5 px-6 h-10">
            <div className="flex items-center gap-2 min-w-0">
               <SidebarTrigger />
               <span className="inline-flex size-5 items-center justify-center rounded bg-muted/50 text-xs shrink-0">{view.icon}</span>
               <span className="text-sm font-medium truncate">{view.name}</span>
               <Star className="size-3.5 text-muted-foreground shrink-0 ml-1" />
               <MoreHorizontal className="size-3.5 text-muted-foreground shrink-0" />
            </div>
         </div>
         <div className="w-full flex justify-between items-center gap-3 border-b py-1.5 px-6 h-10">
            <span className="min-w-0 truncate text-xs text-muted-foreground">
               {team ? `${team.name} · ` : ''}{view.viewType === 'issue' ? 'Issue' : 'Project'} view · {view.owner.displayName}
            </span>
            <div className="flex items-center gap-1">
               {view.viewType === 'issue' && (
                  <Button size="xs" variant={openPanel === 'insights' ? 'secondary' : 'ghost'} onClick={() => togglePanel('insights')}>
                     <BarChart3 className="size-4" />
                  </Button>
               )}
               {view.canManage && (
                  <Button size="xs" variant="ghost" onClick={() => void deleteView()} aria-label="Delete saved view">
                     <Trash2 className="size-4" />
                  </Button>
               )}
            </div>
         </div>
      </div>
   );
}
