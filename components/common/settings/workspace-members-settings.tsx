'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { MailPlus, RefreshCw, ShieldCheck, Trash2, Users, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWorkspace } from '@/components/providers/workspace-provider';
import type {
   WorkspaceInvitationDeliveryState,
   WorkspaceInvitationDto,
   WorkspaceInvitationRole,
} from '@/lib/invitations/contracts';
import type { TeamDto } from '@/lib/teams/contracts';
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

const unavailableDelivery: WorkspaceInvitationDeliveryState = {
   available: false,
   reason: 'Invitation email delivery is unavailable until a verified sender is configured.',
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
   const [invitations, setInvitations] = useState<WorkspaceInvitationDto[]>([]);
   const [teams, setTeams] = useState<TeamDto[]>([]);
   const [invitationsLoading, setInvitationsLoading] = useState(false);
   const [invitationDelivery, setInvitationDelivery] =
      useState<WorkspaceInvitationDeliveryState>(unavailableDelivery);
   const [inviteEmail, setInviteEmail] = useState('');
   const [inviteRole, setInviteRole] = useState<WorkspaceInvitationRole>('member');
   const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
   const [invitationMutation, setInvitationMutation] = useState<string | null>(null);

   const endpoint = useMemo(
      () => `/api/members?organization=${encodeURIComponent(workspace.organization.slug)}`,
      [workspace.organization.slug]
   );
   const invitationsEndpoint = useMemo(
      () => `/api/invitations?organization=${encodeURIComponent(workspace.organization.slug)}`,
      [workspace.organization.slug]
   );
   const teamsEndpoint = useMemo(
      () => `/api/teams?organization=${encodeURIComponent(workspace.organization.slug)}`,
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

   useEffect(() => {
      if (!workspace.configured || !canAdmin) {
         setInvitations([]);
         setTeams([]);
         setInvitationDelivery(unavailableDelivery);
         return;
      }

      const controller = new AbortController();
      setInvitationsLoading(true);
      void Promise.all([
         fetch(invitationsEndpoint, {
            credentials: 'same-origin',
            signal: controller.signal,
            headers: { Accept: 'application/json' },
         }),
         fetch(teamsEndpoint, {
            credentials: 'same-origin',
            signal: controller.signal,
            headers: { Accept: 'application/json' },
         }),
      ])
         .then(async ([invitationResponse, teamResponse]) => {
            if (!invitationResponse.ok) {
               throw new Error(await readError(invitationResponse, 'Unable to load workspace invitations.'));
            }
            if (!teamResponse.ok) throw new Error(await readError(teamResponse, 'Unable to load teams.'));
            return Promise.all([
               invitationResponse.json() as Promise<{
                  invitations: WorkspaceInvitationDto[];
                  actorRole: WorkspaceMemberRole;
                  delivery: WorkspaceInvitationDeliveryState;
               }>,
               teamResponse.json() as Promise<{ teams: TeamDto[] }>,
            ]);
         })
         .then(([invitationResult, teamResult]) => {
            if (controller.signal.aborted) return;
            setInvitations(invitationResult.invitations);
            setActorRole(invitationResult.actorRole);
            setInvitationDelivery(invitationResult.delivery);
            setTeams(teamResult.teams);
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            toast.error(error instanceof Error ? error.message : 'Unable to load workspace invitations.');
         })
         .finally(() => {
            if (!controller.signal.aborted) setInvitationsLoading(false);
         });

      return () => controller.abort();
   }, [canAdmin, invitationsEndpoint, teamsEndpoint, workspace.configured]);

   const canManage = (member: WorkspaceMemberDto) => {
      if (!workspace.configured || !canAdmin || member.id === currentUserId || member.role === 'owner') return false;
      if (actorRole === 'admin' && member.role === 'admin') return false;
      return true;
   };

   const canManageInvitation = (invitation: WorkspaceInvitationDto) => {
      if (!canAdmin || invitation.status === 'accepted' || invitation.status === 'revoked') return false;
      if (actorRole === 'admin' && invitation.role === 'admin') return false;
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

   const toggleTeam = (teamId: string) => {
      setSelectedTeamIds((current) =>
         current.includes(teamId) ? current.filter((id) => id !== teamId) : [...current, teamId]
      );
   };

   const sendInvitation = async () => {
      if (!canAdmin || !invitationDelivery.available || invitationMutation || !inviteEmail.trim()) return;
      setInvitationMutation('create');
      try {
         const response = await fetch(invitationsEndpoint, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
               email: inviteEmail,
               role: inviteRole,
               teamIds: selectedTeamIds,
            }),
         });
         if (!response.ok) throw new Error(await readError(response, 'Unable to send workspace invitation.'));
         const result = (await response.json()) as { invitation: WorkspaceInvitationDto };
         setInvitations((current) => [result.invitation, ...current]);
         setInviteEmail('');
         setInviteRole('member');
         setSelectedTeamIds([]);
         toast.success(`Invitation sent to ${result.invitation.email}.`);
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to send workspace invitation.');
      } finally {
         setInvitationMutation(null);
      }
   };

   const resendInvitation = async (invitation: WorkspaceInvitationDto) => {
      if (!canManageInvitation(invitation) || !invitationDelivery.available || invitationMutation) return;
      setInvitationMutation(invitation.id);
      try {
         const response = await fetch(
            `/api/invitations/${encodeURIComponent(invitation.id)}/resend?organization=${encodeURIComponent(workspace.organization.slug)}`,
            { method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json' } }
         );
         if (!response.ok) throw new Error(await readError(response, 'Unable to resend workspace invitation.'));
         const result = (await response.json()) as {
            invitation: { id: string; expiresAt: string; status: 'pending' };
         };
         setInvitations((current) =>
            current.map((item) =>
               item.id === result.invitation.id
                  ? { ...item, expiresAt: result.invitation.expiresAt, status: 'pending' }
                  : item
            )
         );
         toast.success(`Invitation resent to ${invitation.email}.`);
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to resend workspace invitation.');
      } finally {
         setInvitationMutation(null);
      }
   };

   const revokeInvitation = async (invitation: WorkspaceInvitationDto) => {
      if (!canManageInvitation(invitation) || invitationMutation) return;
      if (!window.confirm(`Revoke the invitation for ${invitation.email}?`)) return;
      setInvitationMutation(invitation.id);
      try {
         const response = await fetch(
            `/api/invitations/${encodeURIComponent(invitation.id)}?organization=${encodeURIComponent(workspace.organization.slug)}`,
            { method: 'DELETE', credentials: 'same-origin', headers: { Accept: 'application/json' } }
         );
         if (!response.ok) throw new Error(await readError(response, 'Unable to revoke workspace invitation.'));
         const result = (await response.json()) as { invitation: { id: string; revokedAt: string } };
         setInvitations((current) =>
            current.map((item) =>
               item.id === result.invitation.id
                  ? { ...item, revokedAt: result.invitation.revokedAt, status: 'revoked' }
                  : item
            )
         );
         toast.success(`Invitation for ${invitation.email} revoked.`);
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to revoke workspace invitation.');
      } finally {
         setInvitationMutation(null);
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

         <SettingsSection title="Invitations" description="Invite people by email, optionally assign teams, and manage outstanding access links.">
            {!canAdmin ? (
               <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2"><Users className="size-4" /> Only workspace owners and admins can manage invitations.</span>
               </div>
            ) : (
               <div className="space-y-4">
                  <div className={`rounded-lg border px-4 py-3 text-sm ${invitationDelivery.available ? 'bg-muted/20 text-muted-foreground' : 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300'}`}>
                     {invitationDelivery.available
                        ? 'Invitation email delivery is configured. Tokens are generated and sent only by the server.'
                        : invitationDelivery.reason}
                  </div>

                  <SettingsCard>
                     <div className="space-y-4 p-4">
                        <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
                           <div className="space-y-2">
                              <Label htmlFor="invite-email">Email address</Label>
                              <Input
                                 id="invite-email"
                                 type="email"
                                 inputMode="email"
                                 autoComplete="off"
                                 maxLength={254}
                                 placeholder="name@company.com"
                                 value={inviteEmail}
                                 onChange={(event) => setInviteEmail(event.target.value)}
                                 disabled={!invitationDelivery.available || invitationMutation !== null}
                              />
                           </div>
                           <div className="space-y-2">
                              <Label htmlFor="invite-role">Workspace role</Label>
                              <select
                                 id="invite-role"
                                 value={inviteRole}
                                 onChange={(event) => setInviteRole(event.target.value as WorkspaceInvitationRole)}
                                 className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                                 disabled={!invitationDelivery.available || invitationMutation !== null}
                              >
                                 {actorRole === 'owner' && <option value="admin">Admin</option>}
                                 <option value="member">Member</option>
                                 <option value="guest">Guest</option>
                              </select>
                           </div>
                        </div>

                        <div className="space-y-2">
                           <Label>Optional teams</Label>
                           {teams.length === 0 ? (
                              <p className="text-xs text-muted-foreground">No teams are available for pre-assignment.</p>
                           ) : (
                              <div className="grid max-h-40 gap-2 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2">
                                 {teams.map((team) => (
                                    <label key={team.id} className="flex items-center gap-2 text-sm">
                                       <input
                                          type="checkbox"
                                          checked={selectedTeamIds.includes(team.id)}
                                          onChange={() => toggleTeam(team.id)}
                                          disabled={!invitationDelivery.available || invitationMutation !== null}
                                       />
                                       <span className="truncate">{team.name}</span>
                                    </label>
                                 ))}
                              </div>
                           )}
                        </div>

                        <Button
                           onClick={() => void sendInvitation()}
                           disabled={
                              !invitationDelivery.available ||
                              !inviteEmail.trim() ||
                              invitationMutation !== null
                           }
                        >
                           <MailPlus className="size-4" />
                           {invitationMutation === 'create' ? 'Sending…' : 'Send invitation'}
                        </Button>
                     </div>
                  </SettingsCard>

                  <SettingsCard>
                     {invitationsLoading ? (
                        <p className="p-8 text-center text-sm text-muted-foreground" role="status">Loading invitations…</p>
                     ) : invitations.length === 0 ? (
                        <p className="p-8 text-center text-sm text-muted-foreground">No workspace invitations yet.</p>
                     ) : (
                        invitations.map((invitation) => {
                           const manageable = canManageInvitation(invitation);
                           const mutating = invitationMutation === invitation.id;
                           const teamNames = invitation.teamIds
                              .map((id) => teams.find((team) => team.id === id)?.name)
                              .filter((name): name is string => Boolean(name));
                           return (
                              <div key={invitation.id} className="flex flex-wrap items-center gap-3 border-b p-4 last:border-0">
                                 <div className="min-w-52 flex-1">
                                    <p className="truncate text-sm font-medium">{invitation.email}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                       <span className="capitalize">{invitation.role}</span> · {teamNames.length ? teamNames.join(', ') : 'No team pre-assignment'} · expires {format(parseISO(invitation.expiresAt), 'MMM d, yyyy')}
                                    </p>
                                 </div>
                                 <span className="rounded-full border px-2 py-1 text-xs capitalize text-muted-foreground">{invitation.status}</span>
                                 {manageable && (
                                    <div className="flex items-center gap-1">
                                       <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => void resendInvitation(invitation)}
                                          disabled={!invitationDelivery.available || mutating || invitationMutation !== null}
                                       >
                                          <RefreshCw className="size-3.5" /> Resend
                                       </Button>
                                       <Button
                                          variant="ghost"
                                          size="icon"
                                          className="size-8 text-muted-foreground hover:text-destructive"
                                          onClick={() => void revokeInvitation(invitation)}
                                          disabled={mutating || invitationMutation !== null}
                                          aria-label={`Revoke invitation for ${invitation.email}`}
                                       >
                                          <XCircle className="size-4" />
                                       </Button>
                                    </div>
                                 )}
                              </div>
                           );
                        })
                     )}
                  </SettingsCard>
               </div>
            )}
         </SettingsSection>
      </SettingsShell>
   );
}
