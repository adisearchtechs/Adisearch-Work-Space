'use client';

import { useEffect, useMemo, useState } from 'react';
import { Save, UserPlus, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '@/components/providers/workspace-provider';
import type { TeamDetailsDto, TeamMemberDto } from '@/lib/teams/contracts';
import { teams as demoTeams } from '@/mock-data/teams';
import { SettingsCard, SettingsSection } from './shared';

interface TeamSettingsProps {
   teamId: string;
}

const DEFAULT_COLOR = '#5E6AD2';

const readError = async (response: Response, fallback: string) => {
   try {
      const body = (await response.json()) as { error?: string };
      return body.error || fallback;
   } catch {
      return fallback;
   }
};

export default function TeamSettings({ teamId }: TeamSettingsProps) {
   const workspace = useWorkspace();
   const [team, setTeam] = useState<TeamDetailsDto | null>(null);
   const [loading, setLoading] = useState(workspace.configured);
   const [canAdmin, setCanAdmin] = useState(
      workspace.user.role === 'owner' || workspace.user.role === 'admin'
   );
   const [name, setName] = useState('');
   const [key, setKey] = useState('');
   const [issuePrefix, setIssuePrefix] = useState('');
   const [color, setColor] = useState(DEFAULT_COLOR);
   const [selectedMemberId, setSelectedMemberId] = useState('');
   const [submitting, setSubmitting] = useState(false);

   const endpoint = useMemo(
      () =>
         `/api/teams/${encodeURIComponent(teamId)}?organization=${encodeURIComponent(workspace.organization.slug)}`,
      [teamId, workspace.organization.slug]
   );

   const demoTeam = useMemo<TeamDetailsDto | null>(() => {
      const source = demoTeams.find((candidate) => candidate.id === teamId);
      if (!source) return null;
      const members: TeamMemberDto[] = source.members.map((member) => ({
         id: member.id,
         displayName: member.name,
         avatarUrl: member.avatarUrl ?? null,
         role: 'member',
      }));
      return {
         id: source.id,
         name: source.name,
         key: source.id.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'DEMO',
         issuePrefix: source.id.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'DEMO',
         color: DEFAULT_COLOR,
         createdAt: '2026-01-01T00:00:00.000Z',
         updatedAt: '2026-01-01T00:00:00.000Z',
         usage: { members: members.length, issues: 0, projects: source.projects.length, cycles: 0 },
         members,
         organizationMembers: members,
      };
   }, [teamId]);

   useEffect(() => {
      if (!workspace.configured) return;
      const controller = new AbortController();
      setLoading(true);
      void fetch(endpoint, {
         credentials: 'same-origin',
         signal: controller.signal,
         headers: { Accept: 'application/json' },
      })
         .then(async (response) => {
            if (!response.ok) throw new Error(await readError(response, 'Unable to load team.'));
            return (await response.json()) as { team: TeamDetailsDto; canAdmin: boolean };
         })
         .then((result) => {
            if (controller.signal.aborted) return;
            setTeam(result.team);
            setCanAdmin(result.canAdmin);
            setName(result.team.name);
            setKey(result.team.key);
            setIssuePrefix(result.team.issuePrefix);
            setColor(result.team.color);
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            toast.error(error instanceof Error ? error.message : 'Unable to load team.');
         })
         .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
         });
      return () => controller.abort();
   }, [endpoint, workspace.configured]);

   const activeTeam = workspace.configured ? team : demoTeam;
   const assignedIds = new Set(activeTeam?.members.map((member) => member.id) ?? []);
   const availableMembers =
      activeTeam?.organizationMembers.filter((member) => !assignedIds.has(member.id)) ?? [];

   const saveTeam = async () => {
      if (!workspace.configured || !canAdmin || !activeTeam || submitting) return;
      setSubmitting(true);
      try {
         const response = await fetch(endpoint, {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ name: name.trim(), key, issuePrefix, color }),
         });
         if (!response.ok) throw new Error(await readError(response, 'Unable to update team.'));
         const { team: saved } = (await response.json()) as {
            team: Pick<TeamDetailsDto, 'id' | 'name' | 'key' | 'issuePrefix' | 'color' | 'createdAt' | 'updatedAt'>;
         };
         setTeam((current) => (current ? { ...current, ...saved } : current));
         toast.success('Team settings saved.');
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to update team.');
      } finally {
         setSubmitting(false);
      }
   };

   const addMember = async () => {
      if (!workspace.configured || !canAdmin || !activeTeam || !selectedMemberId || submitting) return;
      const member = activeTeam.organizationMembers.find((candidate) => candidate.id === selectedMemberId);
      if (!member) return;
      setSubmitting(true);
      try {
         const response = await fetch(
            `/api/teams/${encodeURIComponent(activeTeam.id)}/members?organization=${encodeURIComponent(workspace.organization.slug)}`,
            {
               method: 'POST',
               credentials: 'same-origin',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ userId: member.id }),
            }
         );
         if (!response.ok) throw new Error(await readError(response, 'Unable to add team member.'));
         setTeam((current) =>
            current
               ? {
                    ...current,
                    members: current.members.some((item) => item.id === member.id)
                       ? current.members
                       : [...current.members, member],
                    usage: { ...current.usage, members: current.usage.members + 1 },
                 }
               : current
         );
         setSelectedMemberId('');
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to add team member.');
      } finally {
         setSubmitting(false);
      }
   };

   const removeMember = async (member: TeamMemberDto) => {
      if (!workspace.configured || !canAdmin || !activeTeam || submitting) return;
      if (!window.confirm(`Remove ${member.displayName} from ${activeTeam.name}?`)) return;
      setSubmitting(true);
      try {
         const response = await fetch(
            `/api/teams/${encodeURIComponent(activeTeam.id)}/members/${encodeURIComponent(member.id)}?organization=${encodeURIComponent(workspace.organization.slug)}`,
            { method: 'DELETE', credentials: 'same-origin' }
         );
         if (!response.ok) throw new Error(await readError(response, 'Unable to remove team member.'));
         setTeam((current) =>
            current
               ? {
                    ...current,
                    members: current.members.filter((item) => item.id !== member.id),
                    usage: { ...current.usage, members: Math.max(0, current.usage.members - 1) },
                 }
               : current
         );
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to remove team member.');
      } finally {
         setSubmitting(false);
      }
   };

   if (loading) {
      return <div className="flex h-full items-center justify-center text-sm text-muted-foreground" role="status">Loading team…</div>;
   }
   if (!activeTeam) {
      return <div className="mx-auto max-w-2xl px-6 py-10"><h1 className="text-2xl font-medium">Team not found</h1></div>;
   }

   return (
      <div className="h-full w-full overflow-y-auto">
         <div className="mx-auto max-w-3xl px-6 py-10 pb-20">
            <div className="flex items-center gap-3">
               <span className="size-9 shrink-0 rounded-md" style={{ backgroundColor: activeTeam.color }} />
               <div className="min-w-0 flex-1">
                  <h1 className="truncate text-2xl font-medium">{activeTeam.name}</h1>
                  <p className="text-sm text-muted-foreground">{activeTeam.key} · issue prefix {activeTeam.issuePrefix}</p>
               </div>
               <span className="text-xs text-muted-foreground">{activeTeam.usage.projects} projects · {activeTeam.usage.issues} issues</span>
            </div>

            {!workspace.configured && (
               <div className="mt-6 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  Demo team settings are read-only.
               </div>
            )}

            <div className="mt-10 flex flex-col gap-10">
               <SettingsSection title="General" description="Team identity and issue identifier settings.">
                  <SettingsCard>
                     <div className="grid gap-4 p-4">
                        <label className="grid gap-1.5 text-xs font-medium">Name<Input value={workspace.configured ? name : activeTeam.name} onChange={(event) => setName(event.target.value)} maxLength={80} disabled={!canAdmin || !workspace.configured || submitting} /></label>
                        <div className="grid gap-4 sm:grid-cols-3">
                           <label className="grid gap-1.5 text-xs font-medium">Key<Input value={workspace.configured ? key : activeTeam.key} onChange={(event) => setKey(event.target.value.toUpperCase())} maxLength={10} disabled={!canAdmin || !workspace.configured || submitting} /></label>
                           <label className="grid gap-1.5 text-xs font-medium">Issue prefix<Input value={workspace.configured ? issuePrefix : activeTeam.issuePrefix} onChange={(event) => setIssuePrefix(event.target.value.toUpperCase())} maxLength={10} disabled={!canAdmin || !workspace.configured || submitting} /></label>
                           <label className="grid gap-1.5 text-xs font-medium">Color<Input type="color" value={workspace.configured ? color : activeTeam.color} onChange={(event) => setColor(event.target.value.toUpperCase())} className="w-16 p-1" disabled={!canAdmin || !workspace.configured || submitting} /></label>
                        </div>
                        <p className="text-xs text-muted-foreground">Changing the issue prefix changes how existing team issue identifiers are displayed. Keys and prefixes must be unique within the workspace.</p>
                        {workspace.configured && canAdmin && (
                           <div><Button size="sm" onClick={() => void saveTeam()} disabled={submitting || name.trim().length < 2 || key.length < 2 || issuePrefix.length < 2} className="gap-1.5"><Save className="size-4" /> {submitting ? 'Saving…' : 'Save changes'}</Button></div>
                        )}
                     </div>
                  </SettingsCard>
               </SettingsSection>

               <SettingsSection title="Members" description="Workspace owners and admins control team membership.">
                  <SettingsCard>
                     {activeTeam.members.length === 0 ? (
                        <p className="p-4 text-sm text-muted-foreground">No team members assigned.</p>
                     ) : (
                        activeTeam.members.map((member) => (
                           <div key={member.id} className="flex items-center gap-3 border-b p-4 last:border-0">
                              <Avatar className="size-8"><AvatarImage src={member.avatarUrl ?? undefined} alt={member.displayName} /><AvatarFallback>{member.displayName.slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>
                              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{member.displayName}</p><p className="text-xs capitalize text-muted-foreground">Workspace {member.role}</p></div>
                              {workspace.configured && canAdmin && (
                                 <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => void removeMember(member)} disabled={submitting} aria-label={`Remove ${member.displayName}`}><X className="size-4" /></Button>
                              )}
                           </div>
                        ))
                     )}
                     {workspace.configured && canAdmin && (
                        <div className="flex flex-wrap items-center gap-2 border-t p-4">
                           <select value={selectedMemberId} onChange={(event) => setSelectedMemberId(event.target.value)} className="border-input bg-background h-9 min-w-56 flex-1 rounded-md border px-2 text-sm" disabled={submitting || availableMembers.length === 0} aria-label="Choose workspace member">
                              <option value="">{availableMembers.length === 0 ? 'All workspace members assigned' : 'Choose workspace member…'}</option>
                              {availableMembers.map((member) => <option key={member.id} value={member.id}>{member.displayName} · {member.role}</option>)}
                           </select>
                           <Button size="sm" variant="outline" onClick={() => void addMember()} disabled={!selectedMemberId || submitting} className="gap-1.5"><UserPlus className="size-4" /> Add member</Button>
                        </div>
                     )}
                  </SettingsCard>
               </SettingsSection>

               <SettingsSection title="Usage" description="Current persistent data linked to this team.">
                  <SettingsCard>
                     <div className="grid grid-cols-2 gap-4 p-4 text-sm sm:grid-cols-4">
                        <div><p className="text-xs text-muted-foreground">Members</p><p className="mt-1 inline-flex items-center gap-1 font-medium"><Users className="size-4" /> {activeTeam.usage.members}</p></div>
                        <div><p className="text-xs text-muted-foreground">Issues</p><p className="mt-1 font-medium">{activeTeam.usage.issues}</p></div>
                        <div><p className="text-xs text-muted-foreground">Projects</p><p className="mt-1 font-medium">{activeTeam.usage.projects}</p></div>
                        <div><p className="text-xs text-muted-foreground">Cycles</p><p className="mt-1 font-medium">{activeTeam.usage.cycles}</p></div>
                     </div>
                  </SettingsCard>
               </SettingsSection>

               <SettingsSection title="Lifecycle" description="Retirement and hard deletion are intentionally deferred until non-destructive lifecycle rules are defined.">
                  <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">This phase does not expose hard team deletion. Existing projects and cycles currently cascade on team deletion while issues restrict it, so deletion is unsafe as an administrative action.</div>
               </SettingsSection>
            </div>
         </div>
      </div>
   );
}
