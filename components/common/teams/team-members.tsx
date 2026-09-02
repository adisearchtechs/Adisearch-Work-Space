'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, UserMinus, Users } from 'lucide-react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
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
import { useWorkspace } from '@/components/providers/workspace-provider';
import type { TeamDetailsDto, TeamDto, TeamMemberDto } from '@/lib/teams/contracts';
import { teams as demoTeams } from '@/mock-data/teams';
import { resolveTeamReference, useTeamsStore } from '@/store/teams-store';

async function readError(response: Response, fallback: string) {
   try {
      const body = (await response.json()) as { error?: string };
      return body.error || fallback;
   } catch {
      return fallback;
   }
}

export default function TeamMembers() {
   const workspace = useWorkspace();
   const { teamId } = useParams<{ orgId: string; teamId: string }>();
   const teams = useTeamsStore((state) => state.teams);
   const workspaceSlug = useTeamsStore((state) => state.workspaceSlug);
   const teamsLoading = useTeamsStore((state) => state.loading);
   const replaceTeams = useTeamsStore((state) => state.replaceTeams);
   const resolvedTeam =
      workspace.configured && workspaceSlug === workspace.organization.slug
         ? resolveTeamReference(teams, teamId)
         : undefined;
   const [details, setDetails] = useState<TeamDetailsDto | null>(null);
   const [canAdmin, setCanAdmin] = useState(false);
   const [loading, setLoading] = useState(workspace.configured);
   const [mutatingUserId, setMutatingUserId] = useState<string | null>(null);
   const [addOpen, setAddOpen] = useState(false);
   const [search, setSearch] = useState('');

   const organizationQuery = useMemo(
      () => `?organization=${encodeURIComponent(workspace.organization.slug)}`,
      [workspace.organization.slug]
   );
   const detailEndpoint = resolvedTeam
      ? `/api/teams/${encodeURIComponent(resolvedTeam.id)}${organizationQuery}`
      : null;

   const refreshDetails = useCallback(async () => {
      if (!workspace.configured || !detailEndpoint) return;
      const response = await fetch(detailEndpoint, {
         credentials: 'same-origin',
         headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(await readError(response, 'Unable to load team members.'));
      const result = (await response.json()) as { team: TeamDetailsDto; canAdmin: boolean };
      setDetails(result.team);
      setCanAdmin(result.canAdmin);
   }, [detailEndpoint, workspace.configured]);

   const refreshRuntimeTeams = useCallback(async () => {
      if (!workspace.configured) return;
      const response = await fetch(`/api/teams${organizationQuery}`, {
         credentials: 'same-origin',
         headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(await readError(response, 'Unable to refresh team navigation.'));
      const result = (await response.json()) as { teams: TeamDto[]; joinedTeamIds: string[] };
      replaceTeams(workspace.organization.slug, result.teams, result.joinedTeamIds);
   }, [organizationQuery, replaceTeams, workspace.configured, workspace.organization.slug]);

   useEffect(() => {
      if (!workspace.configured || !detailEndpoint) return;
      let active = true;
      setLoading(true);
      void fetch(detailEndpoint, {
         credentials: 'same-origin',
         headers: { Accept: 'application/json' },
      })
         .then(async (response) => {
            if (!response.ok) throw new Error(await readError(response, 'Unable to load team members.'));
            return (await response.json()) as { team: TeamDetailsDto; canAdmin: boolean };
         })
         .then((result) => {
            if (!active) return;
            setDetails(result.team);
            setCanAdmin(result.canAdmin);
         })
         .catch((error: unknown) => {
            if (!active) return;
            toast.error(error instanceof Error ? error.message : 'Unable to load team members.');
         })
         .finally(() => {
            if (active) setLoading(false);
         });
      return () => {
         active = false;
      };
   }, [detailEndpoint, workspace.configured]);

   if (!workspace.configured) {
      const team = demoTeams.find((candidate) => candidate.id === teamId) ?? demoTeams[0];
      const members = [...team.members].sort((left, right) => left.name.localeCompare(right.name));
      return (
         <div className="w-full">
            <div className="flex items-center justify-between border-b px-6 py-3">
               <div>
                  <p className="text-sm font-medium">{team.name} members</p>
                  <p className="text-xs text-muted-foreground">Demo membership is read-only.</p>
               </div>
               <Button size="xs" variant="secondary" disabled>
                  <Plus className="size-4 mr-1" /> Add a member
               </Button>
            </div>
            <div className="divide-y">
               {members.map((member) => (
                  <div key={member.id} className="flex h-12 items-center gap-3 px-6 text-sm">
                     <Avatar className="size-6"><AvatarImage src={member.avatarUrl} alt={member.name} /><AvatarFallback>{member.name[0]}</AvatarFallback></Avatar>
                     <span className="min-w-0 flex-1 truncate font-medium">{member.name}</span>
                     <span className="text-xs text-muted-foreground">{member.role}</span>
                  </div>
               ))}
            </div>
         </div>
      );
   }

   if (teamsLoading || workspaceSlug !== workspace.organization.slug || loading) {
      return <div className="flex h-full items-center justify-center text-sm text-muted-foreground" role="status">Loading members…</div>;
   }
   if (!resolvedTeam || !details) {
      return <div className="mx-auto max-w-2xl px-6 py-10"><h1 className="text-2xl font-medium">Team not found</h1></div>;
   }

   const members = [...details.members].sort((left, right) => left.displayName.localeCompare(right.displayName));
   const memberIds = new Set(details.members.map((member) => member.id));
   const candidates = details.organizationMembers
      .filter((member) => !memberIds.has(member.id))
      .filter((member) => member.displayName.toLowerCase().includes(search.trim().toLowerCase()))
      .sort((left, right) => left.displayName.localeCompare(right.displayName));

   const addMember = async (member: TeamMemberDto) => {
      if (!canAdmin || mutatingUserId) return;
      setMutatingUserId(member.id);
      try {
         const response = await fetch(
            `/api/teams/${encodeURIComponent(resolvedTeam.id)}/members${organizationQuery}`,
            {
               method: 'POST',
               credentials: 'same-origin',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ userId: member.id }),
            }
         );
         if (!response.ok) throw new Error(await readError(response, 'Unable to add team member.'));
         await Promise.all([refreshDetails(), refreshRuntimeTeams()]);
         toast.success(`${member.displayName} added to ${resolvedTeam.name}.`);
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to add team member.');
      } finally {
         setMutatingUserId(null);
      }
   };

   const removeMember = async (member: TeamMemberDto) => {
      if (!canAdmin || mutatingUserId) return;
      if (!window.confirm(`Remove ${member.displayName} from ${resolvedTeam.name}?`)) return;
      setMutatingUserId(member.id);
      try {
         const response = await fetch(
            `/api/teams/${encodeURIComponent(resolvedTeam.id)}/members/${encodeURIComponent(member.id)}${organizationQuery}`,
            { method: 'DELETE', credentials: 'same-origin' }
         );
         if (!response.ok) throw new Error(await readError(response, 'Unable to remove team member.'));
         await Promise.all([refreshDetails(), refreshRuntimeTeams()]);
         toast.success(`${member.displayName} removed from ${resolvedTeam.name}.`);
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to remove team member.');
      } finally {
         setMutatingUserId(null);
      }
   };

   return (
      <div className="w-full">
         <div className="flex items-center justify-between gap-3 border-b px-6 py-3">
            <div>
               <p className="text-sm font-medium">{resolvedTeam.name} members</p>
               <p className="text-xs text-muted-foreground">{members.length} assigned · roles come from workspace membership</p>
            </div>
            {canAdmin && (
               <Button size="xs" variant="secondary" onClick={() => setAddOpen(true)}>
                  <Plus className="size-4 mr-1" /> Add a member
               </Button>
            )}
         </div>

         <div className="grid grid-cols-[minmax(0,1fr)_120px_44px] border-b bg-container px-6 py-2 text-xs font-medium text-muted-foreground sm:grid-cols-[minmax(0,1fr)_160px_90px]">
            <span>Name</span><span>Workspace role</span><span className="text-right">{canAdmin ? 'Action' : ''}</span>
         </div>

         {members.length === 0 ? (
            <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-16 text-center">
               <Users className="size-8 text-muted-foreground" />
               <div><p className="text-sm font-medium">No members assigned</p><p className="mt-1 text-sm text-muted-foreground">{canAdmin ? 'Add a workspace member to this team.' : 'A workspace owner or admin can assign team members.'}</p></div>
            </div>
         ) : (
            <div className="divide-y">
               {members.map((member) => (
                  <div key={member.id} className="grid min-h-14 grid-cols-[minmax(0,1fr)_120px_44px] items-center gap-3 px-6 text-sm hover:bg-sidebar/40 sm:grid-cols-[minmax(0,1fr)_160px_90px]">
                     <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar className="size-7 shrink-0"><AvatarImage src={member.avatarUrl ?? undefined} alt={member.displayName} /><AvatarFallback>{member.displayName.slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>
                        <span className="truncate font-medium">{member.displayName}</span>
                     </div>
                     <span className="w-fit rounded-md bg-accent px-2 py-1 text-xs capitalize text-muted-foreground">{member.role}</span>
                     <div className="flex justify-end">
                        {canAdmin && (
                           <Button type="button" variant="ghost" size="icon" className="size-8" disabled={mutatingUserId !== null} aria-label={`Remove ${member.displayName}`} onClick={() => void removeMember(member)}>
                              <UserMinus className="size-4" />
                           </Button>
                        )}
                     </div>
                  </div>
               ))}
            </div>
         )}

         {!canAdmin && <p className="border-t px-6 py-3 text-xs text-muted-foreground">Team membership is managed by workspace owners and admins.</p>}

         <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) setSearch(''); }}>
            <DialogContent>
               <DialogHeader><DialogTitle>Add team members</DialogTitle><DialogDescription>Choose existing workspace members to add to {resolvedTeam.name}.</DialogDescription></DialogHeader>
               <div className="relative"><Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search workspace members…" className="pl-8" /></div>
               <div className="max-h-80 divide-y overflow-y-auto rounded-md border">
                  {candidates.length === 0 ? (
                     <p className="p-6 text-center text-sm text-muted-foreground">{details.organizationMembers.length === details.members.length ? 'Everyone in the workspace is already on this team.' : 'No matching workspace members.'}</p>
                  ) : candidates.map((member) => (
                     <div key={member.id} className="flex items-center gap-3 p-3">
                        <Avatar className="size-7"><AvatarImage src={member.avatarUrl ?? undefined} alt={member.displayName} /><AvatarFallback>{member.displayName.slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{member.displayName}</p><p className="text-xs capitalize text-muted-foreground">{member.role}</p></div>
                        <Button size="xs" disabled={mutatingUserId !== null} onClick={() => void addMember(member)}>{mutatingUserId === member.id ? 'Adding…' : 'Add'}</Button>
                     </div>
                  ))}
               </div>
               <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Close</Button></DialogFooter>
            </DialogContent>
         </Dialog>
      </div>
   );
}
