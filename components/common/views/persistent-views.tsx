'use client';

import { useMemo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { cn } from '@/lib/utils';
import type { SavedViewFilter, SavedViewType, SavedViewDto } from '@/lib/views/contracts';
import { resolveTeamReference, useTeamsStore } from '@/store/teams-store';
import { useSavedViewsStore } from '@/store/saved-views-store';
import { useViewsDisplayStore } from '@/store/views-display-store';
import { ArrowDown, Plus } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { parseAsStringLiteral, useQueryState } from 'nuqs';
import { toast } from 'sonner';

const TABS = ['issues', 'projects'] as const;
const PRESETS = ['all', 'active', 'backlog', 'completed', 'high-priority', 'has-project'] as const;
type Preset = (typeof PRESETS)[number];

function presetFilter(preset: Preset, viewType: SavedViewType): SavedViewFilter {
   switch (preset) {
      case 'active':
         return { statusCategories: ['triage', 'unstarted', 'started'] };
      case 'backlog':
         return { statusCategories: ['backlog'] };
      case 'completed':
         return { statusCategories: ['completed'] };
      case 'high-priority':
         return viewType === 'issue' ? { priorityIds: ['urgent', 'high'] } : {};
      case 'has-project':
         return viewType === 'issue' ? { hasProject: true } : {};
      case 'all':
      default:
         return {};
   }
}

async function readError(response: Response, fallback: string) {
   try {
      const body = (await response.json()) as { error?: string };
      return body.error || fallback;
   } catch {
      return fallback;
   }
}

function formatDate(value: string) {
   return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(
      new Date(value)
   );
}

export default function PersistentViews({ teamId }: { teamId?: string }) {
   const workspace = useWorkspace();
   const { orgId } = useParams<{ orgId: string }>();
   const views = useSavedViewsStore((state) => state.views);
   const viewsLoading = useSavedViewsStore((state) => state.loading);
   const viewsWorkspaceSlug = useSavedViewsStore((state) => state.workspaceSlug);
   const canWrite = useSavedViewsStore((state) => state.canWrite);
   const addView = useSavedViewsStore((state) => state.addView);
   const teams = useTeamsStore((state) => state.teams);
   const teamsLoading = useTeamsStore((state) => state.loading);
   const teamsWorkspaceSlug = useTeamsStore((state) => state.workspaceSlug);
   const [tab, setTab] = useQueryState('tab', parseAsStringLiteral(TABS).withDefault('issues'));
   const { ordering } = useViewsDisplayStore();
   const [createOpen, setCreateOpen] = useState(false);
   const [name, setName] = useState('');
   const [description, setDescription] = useState('');
   const [icon, setIcon] = useState('👁️');
   const [preset, setPreset] = useState<Preset>('all');
   const [submitting, setSubmitting] = useState(false);

   const team =
      teamId && teamsWorkspaceSlug === workspace.organization.slug && !teamsLoading
         ? resolveTeamReference(teams, teamId)
         : undefined;
   const viewType: SavedViewType = tab === 'issues' ? 'issue' : 'project';
   const workspaceReady =
      viewsWorkspaceSlug === workspace.organization.slug &&
      !viewsLoading &&
      teamsWorkspaceSlug === workspace.organization.slug &&
      !teamsLoading;

   const list = useMemo(() => {
      let result = views.filter((view) => view.viewType === viewType);
      if (teamId) result = team ? result.filter((view) => view.teamId === team.id) : [];
      return [...result].sort((left, right) => {
         if (ordering === 'created') return right.createdAt.localeCompare(left.createdAt);
         if (ordering === 'updated') return right.updatedAt.localeCompare(left.updatedAt);
         return left.name.localeCompare(right.name);
      });
   }, [ordering, team, teamId, viewType, views]);

   if (!workspaceReady) {
      return (
         <div className="flex h-full items-center justify-center text-sm text-muted-foreground" role="status">
            Loading saved views…
         </div>
      );
   }
   if (teamId && !team) {
      return (
         <div className="mx-auto max-w-2xl px-6 py-10">
            <h1 className="text-2xl font-medium">Team not found</h1>
         </div>
      );
   }

   const createView = async () => {
      if (!canWrite || submitting || name.trim().length === 0) return;
      setSubmitting(true);
      try {
         const response = await fetch(
            `/api/views?organization=${encodeURIComponent(workspace.organization.slug)}`,
            {
               method: 'POST',
               credentials: 'same-origin',
               headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
               body: JSON.stringify({
                  name: name.trim(),
                  description,
                  icon: icon.trim() || '👁️',
                  viewType,
                  teamId: team?.id ?? null,
                  filter: presetFilter(preset, viewType),
               }),
            }
         );
         if (!response.ok) throw new Error(await readError(response, 'Unable to create saved view.'));
         const result = (await response.json()) as { view: SavedViewDto };
         addView(result.view);
         setCreateOpen(false);
         setName('');
         setDescription('');
         setIcon('👁️');
         setPreset('all');
         toast.success('Saved view created.');
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to create saved view.');
      } finally {
         setSubmitting(false);
      }
   };

   return (
      <div className="w-full h-full overflow-y-auto">
         <div className="flex items-center justify-between px-6 pt-3 pb-2">
            <div className="flex items-center gap-1.5">
               {TABS.map((candidate) => (
                  <button
                     key={candidate}
                     onClick={() => {
                        setTab(candidate);
                        setPreset('all');
                     }}
                     className={cn(
                        'px-2.5 py-1 rounded-md border text-xs font-medium capitalize transition-colors',
                        tab === candidate
                           ? 'bg-accent border-transparent'
                           : 'text-muted-foreground hover:bg-accent/50'
                     )}
                  >
                     {candidate}
                  </button>
               ))}
            </div>
            {canWrite && (
               <Button size="xs" variant="secondary" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-3.5" /> Save view
               </Button>
            )}
         </div>

         <div className="flex items-center gap-1 px-6 py-1.5 text-xs text-muted-foreground border-b">
            Name <ArrowDown className="size-3" />
         </div>

         <div className="flex items-center justify-between px-6 py-2 bg-sidebar/60 border-b border-border/50">
            <span className="flex items-center gap-2 text-sm">
               <span
                  className="inline-flex size-5 items-center justify-center rounded border text-[10px] font-semibold"
                  style={team ? { backgroundColor: team.color } : undefined}
               >
                  {team ? team.key.slice(0, 1) : 'A'}
               </span>
               <span className="font-medium">{team ? team.name : 'Adisearch Workspace'}</span>
               <span className="text-muted-foreground text-xs">· {team ? 'Team' : 'Workspace'}</span>
            </span>
            <span className="text-xs text-muted-foreground">{list.length} saved</span>
         </div>

         {list.map((view) => (
            <Link
               key={view.id}
               href={`/${orgId}/view/${view.id}`}
               className="flex items-center gap-3 px-6 py-2.5 border-b border-border/50 hover:bg-sidebar/50 transition-colors"
            >
               <span className="inline-flex size-6 items-center justify-center rounded bg-muted/50 text-sm shrink-0">
                  {view.icon}
               </span>
               <span className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium truncate">{view.name}</span>
                  <span className="text-xs text-muted-foreground truncate">
                     {view.description || 'Saved workspace view'}
                  </span>
               </span>
               <span className="hidden text-xs text-muted-foreground sm:block">
                  {formatDate(ordering === 'created' ? view.createdAt : view.updatedAt)}
               </span>
               <span className="flex items-center gap-1.5 w-32 shrink-0 justify-end">
                  <Avatar className="size-5">
                     <AvatarImage src={view.owner.avatarUrl ?? undefined} alt={view.owner.displayName} />
                     <AvatarFallback className="text-[9px]">
                        {view.owner.displayName.slice(0, 1).toUpperCase()}
                     </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground truncate max-w-24">
                     {view.owner.displayName}
                  </span>
               </span>
            </Link>
         ))}
         {list.length === 0 && (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
               No saved views yet
            </div>
         )}

         <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent>
               <DialogHeader>
                  <DialogTitle>Save a {viewType} view</DialogTitle>
                  <DialogDescription>
                     Create a reusable filtered view{team ? ` for ${team.name}` : ' for the workspace'}.
                  </DialogDescription>
               </DialogHeader>
               <div className="grid gap-4">
                  <label className="grid gap-1.5 text-sm font-medium">
                     Name
                     <Input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        maxLength={160}
                        placeholder="Active delivery"
                     />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium">
                     Description
                     <Input
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        maxLength={1000}
                        placeholder="What this view is for"
                     />
                  </label>
                  <div className="grid grid-cols-[5rem_1fr] gap-3">
                     <label className="grid gap-1.5 text-sm font-medium">
                        Icon
                        <Input value={icon} onChange={(event) => setIcon(event.target.value)} maxLength={16} />
                     </label>
                     <label className="grid gap-1.5 text-sm font-medium">
                        Preset
                        <Select value={preset} onValueChange={(value) => setPreset(value as Preset)}>
                           <SelectTrigger><SelectValue /></SelectTrigger>
                           <SelectContent>
                              <SelectItem value="all">All</SelectItem>
                              <SelectItem value="active">Active work</SelectItem>
                              <SelectItem value="backlog">Backlog</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              {viewType === 'issue' && (
                                 <>
                                    <SelectItem value="high-priority">Urgent + high priority</SelectItem>
                                    <SelectItem value="has-project">Linked to a project</SelectItem>
                                 </>
                              )}
                           </SelectContent>
                        </Select>
                     </label>
                  </div>
               </div>
               <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button onClick={() => void createView()} disabled={submitting || name.trim().length === 0}>
                     {submitting ? 'Saving…' : 'Save view'}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </div>
   );
}
