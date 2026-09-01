'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ShieldCheck, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/components/providers/workspace-provider';
import type { WorkspaceMemberDto, WorkspaceMemberRole } from '@/lib/workspace-members/contracts';
import { SettingsCard, SettingsSection, SettingsShell } from './shared';

const readError = async (response: Response, fallback: string) => {
   try {
      const body = (await response.json()) as { error?: string };
      return body.error || fallback;
   } catch {
      return fallback;
   }
};

export default function WorkspaceMembersSettings() {
   const workspace = useWorkspace();
   const [members, setMembers] = useState<WorkspaceMemberDto[]>([]);
   const [loading, setLoading] = useState(workspace.configured);
   const [canAdmin, setCanAdmin] = useState(
      workspace.user.role === 'owner' || workspace.user.role === 'admin'
   );
   const [actorRole, setActorRole] = useState<WorkspaceMemberRole>(workspace.user.role);
   const [currentUserId, setCurrentUserId] = useState(workspace.user.id);
   const [pendingId, setPendingId] = useState<string | null>(null);

   const endpoint = useMemo(
      () => `/api/members?organization=${encodeURIComponent(workspace.organization.slug)}`,
      [workspace.organization.slug]
   );

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
            if (!response.ok) throw new Error(await readError(response, 'Unable to load workspace members.'));
            return (await response.json()) as {
               members: WorkspaceMemberDto[];
               currentUserId: string;
               actorRole: WorkspaceMemberRole;
               canAdmin: boolean;
            };
         })
         .then((result) => {
            if (controller.signal.aborted) return;
            setMembers(result.members);
            setCurrentUserId(result.currentUserId);
            setActorRole(result.actorRole);
            setCanAdmin(result.canAdmin);
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            toast.error(error instanceof Error ? error.message : 'Unable to load workspace members.');
         })
         .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
         });
      return () => controller.abort();
   }, [endpoint, workspace.configured]);

   const canManage = (member: WorkspaceMemberDto) => {
      if (!workspace.configured || !canAdmin || member.id === currentUserId || member.role === 'owner') return false;
      if (actorRole === 'admin' && member.role === 'admin') return false;
      return true;
   };

   const updateRole = async (member: WorkspaceMemberDto, role: Exclude<WorkspaceMemberRole, 'owner'>) => {
      if (!canManage(member) || pendingId) return;
      setPendingId(member.id);
      try {
         const response = await fetch(
            `/api/members/${encodeURIComponent(member.id)}?organization=${encodeURIComponent(workspace.organization.slug)}`,
            {
               method: 'PATCH',
               credentials: 'same-origin',
               headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
               body: JSON.stringify({ role }),
            }
         );
         if (!response.ok) throw new Error(await readError(response, 'Unable to update workspace member.'));
         setMembers((current) =>
            current.map((item) => (item.id === member.id ? { ...item, role } : item))
         );
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to update workspace member.');
      } finally {
         setPendingId(null);
      }
   };

   const removeMember = async (member: WorkspaceMemberDto) => {
      if (!canManage(member) || pendingId) return;
      if (!window.confirm(`Remove ${member.displayName} from ${workspace.organization.name}?`)) return;
      setPendingId(member.id);
      try {
         const response = await fetch(
            `/api/members/${encodeURIComponent(member.id)}?organization=${encodeURIComponent(workspace.organization.slug)}`,
            { method: 'DELETE', credentials: 'same-origin' }
         );
         if (!response.ok) throw new Error(await readError(response, 'Unable to remove workspace member.'));
         setMembers((current) => current.filter((item) => item.id !== member.id));
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to remove workspace member.');
      } finally {
         setPendingId(null);
      }
   };

   if (!workspace.configured) {
      return (
         <SettingsShell title="Members" description="Manage workspace access and roles">
            <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
               Workspace membership management is available when Supabase authentication is configured.
            </div>
         </SettingsShell>
      );
   }

   return (
      <SettingsShell title="Members" description="Manage who can access the workspace and what they can administer">
         <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Members</p><p className="mt-1 text-2xl font-semibold">{members.length}</p></div>
            <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Admins</p><p className="mt-1 text-2xl font-semibold">{members.filter((member) => member.role === 'owner' || member.role === 'admin').length}</p></div>
            <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Your role</p><p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium capitalize"><ShieldCheck className="size-4" /> {actorRole}</p></div>
         </div>

         <SettingsSection title="Workspace members" description="Owners and admins can manage existing member roles. Ownership transfer is intentionally protected.">
            <SettingsCard>
               {loading ? (
                  <p className="p-8 text-center text-sm text-muted-foreground" role="status">Loading workspace members…</p>
               ) : members.length === 0 ? (
                  <p className="p-8 text-center text-sm text-muted-foreground">No workspace members found.</p>
               ) : (
                  members.map((member) => {
                     const manageable = canManage(member);
                     const pending = pendingId === member.id;
                     const canPromoteAdmin = actorRole === 'owner';
                     return (
                        <div key={member.id} className="flex flex-wrap items-center gap-3 border-b p-4 last:border-0">
                           <Avatar className="size-9"><AvatarImage src={member.avatarUrl ?? undefined} alt={member.displayName} /><AvatarFallback>{member.displayName.slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>
                           <div className="min-w-44 flex-1">
                              <p className="truncate text-sm font-medium">{member.displayName}{member.id === currentUserId ? ' (you)' : ''}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">Joined {format(parseISO(member.joinedAt), 'MMM d, yyyy')} · {member.teamCount} team{member.teamCount === 1 ? '' : 's'} · {member.createdIssueCount} issue{member.createdIssueCount === 1 ? '' : 's'} created</p>
                           </div>
                           {manageable ? (
                              <select
                                 value={member.role}
                                 onChange={(event) => void updateRole(member, event.target.value as Exclude<WorkspaceMemberRole, 'owner'>)}
                                 className="border-input bg-background h-8 rounded-md border px-2 text-xs capitalize"
                                 disabled={pending}
                                 aria-label={`Role for ${member.displayName}`}
                              >
                                 {canPromoteAdmin && <option value="admin">Admin</option>}
                                 <option value="member">Member</option>
                                 <option value="guest">Guest</option>
                              </select>
                           ) : (
                              <span className="rounded-full border px-2 py-1 text-xs capitalize text-muted-foreground">{member.role}</span>
                           )}
                           {manageable && (
                              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => void removeMember(member)} disabled={pending} aria-label={`Remove ${member.displayName}`}><Trash2 className="size-4" /></Button>
                           )}
                        </div>
                     );
                  })
               )}
            </SettingsCard>
         </SettingsSection>

         <SettingsSection title="Invitations" description="New-member email invitations require the transactional email sender to be verified before they can be released safely.">
            <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
               <span className="inline-flex items-center gap-2"><Users className="size-4" /> Existing-member administration is ready. Invitation delivery remains deferred until the workspace email sender is configured.</span>
            </div>
         </SettingsSection>
      </SettingsShell>
   );
}
