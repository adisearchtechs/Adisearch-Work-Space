'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TeamDto } from '@/lib/teams/contracts';
import { teams as demoTeams } from '@/mock-data/teams';
import { SettingsCard, SettingsSection, SettingsShell } from './shared';

const DEFAULT_COLOR = '#5E6AD2';

const readError = async (response: Response, fallback: string) => {
   try {
      const body = (await response.json()) as { error?: string };
      return body.error || fallback;
   } catch {
      return fallback;
   }
};

export default function NewTeam() {
   const workspace = useWorkspace();
   const { orgId } = useParams<{ orgId: string }>();
   const router = useRouter();
   const [teams, setTeams] = useState<TeamDto[]>([]);
   const [loading, setLoading] = useState(workspace.configured);
   const [canAdmin, setCanAdmin] = useState(
      workspace.user.role === 'owner' || workspace.user.role === 'admin'
   );
   const [name, setName] = useState('');
   const [key, setKey] = useState('');
   const [issuePrefix, setIssuePrefix] = useState('');
   const [color, setColor] = useState(DEFAULT_COLOR);
   const [submitting, setSubmitting] = useState(false);

   const endpoint = useMemo(
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
            if (!response.ok) throw new Error(await readError(response, 'Unable to load teams.'));
            return (await response.json()) as { teams: TeamDto[]; canAdmin: boolean };
         })
         .then((result) => {
            if (controller.signal.aborted) return;
            setTeams(result.teams);
            setCanAdmin(result.canAdmin);
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            toast.error(error instanceof Error ? error.message : 'Unable to load teams.');
         })
         .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
         });
      return () => controller.abort();
   }, [endpoint, workspace.configured]);

   const rows: TeamDto[] = workspace.configured
      ? teams
      : demoTeams.map((team) => ({
           id: team.id,
           name: team.name,
           key: team.id.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'DEMO',
           issuePrefix: team.id.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'DEMO',
           color: DEFAULT_COLOR,
           createdAt: '2026-01-01T00:00:00.000Z',
           updatedAt: '2026-01-01T00:00:00.000Z',
           usage: {
              members: team.members.length,
              issues: 0,
              projects: team.projects.length,
              cycles: 0,
           },
        }));

   const createTeam = async () => {
      if (!workspace.configured || !canAdmin || submitting) return;
      setSubmitting(true);
      try {
         const response = await fetch(endpoint, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ name: name.trim(), key, issuePrefix, color }),
         });
         if (!response.ok) throw new Error(await readError(response, 'Unable to create team.'));
         const { team } = (await response.json()) as { team: TeamDto };
         setTeams((current) => [...current, team]);
         router.push(`/${orgId}/settings/teams/${team.id}`);
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to create team.');
      } finally {
         setSubmitting(false);
      }
   };

   return (
      <SettingsShell
         title="Teams"
         description="Organize workspace issues, projects, cycles, and members around the people doing the work"
      >
         {!workspace.configured && (
            <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
               Demo teams are read-only until the workspace is connected to Supabase.
            </div>
         )}

         {workspace.configured && canAdmin && (
            <SettingsSection title="Create a team">
               <SettingsCard>
                  <div className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_7rem_7rem_4rem_auto] md:items-end">
                     <label className="grid gap-1.5 text-xs font-medium">
                        Name
                        <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="Mobile" className="h-8" />
                     </label>
                     <label className="grid gap-1.5 text-xs font-medium">
                        Key
                        <Input value={key} onChange={(event) => setKey(event.target.value.toUpperCase())} maxLength={10} placeholder="MOB" className="h-8" />
                     </label>
                     <label className="grid gap-1.5 text-xs font-medium">
                        Issue prefix
                        <Input value={issuePrefix} onChange={(event) => setIssuePrefix(event.target.value.toUpperCase())} maxLength={10} placeholder="MOB" className="h-8" />
                     </label>
                     <label className="grid gap-1.5 text-xs font-medium">
                        Color
                        <Input type="color" value={color} onChange={(event) => setColor(event.target.value.toUpperCase())} className="h-8 w-14 p-1" aria-label="Team color" />
                     </label>
                     <Button size="sm" onClick={() => void createTeam()} disabled={submitting || name.trim().length < 2 || key.length < 2 || issuePrefix.length < 2} className="gap-1.5">
                        <Plus className="size-4" /> {submitting ? 'Creating…' : 'Create'}
                     </Button>
                  </div>
               </SettingsCard>
            </SettingsSection>
         )}

         <SettingsSection title="Workspace teams">
            <SettingsCard>
               {loading ? (
                  <p className="p-6 text-center text-sm text-muted-foreground" role="status">Loading teams…</p>
               ) : rows.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">No teams yet.</p>
               ) : (
                  rows.map((team) => (
                     <Link
                        key={team.id}
                        href={`/${orgId}/settings/teams/${team.id}`}
                        className="flex items-center gap-3 border-b p-4 last:border-0 hover:bg-muted/30"
                     >
                        <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: team.color }} />
                        <div className="min-w-0 flex-1">
                           <p className="truncate text-sm font-medium">{team.name}</p>
                           <p className="mt-0.5 text-xs text-muted-foreground">{team.key} · {team.issuePrefix}</p>
                        </div>
                        <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
                           <Users className="size-3.5" /> {team.usage.members}
                        </span>
                        <span className="text-xs text-muted-foreground">{team.usage.projects} projects</span>
                        <ArrowRight className="size-4 text-muted-foreground" />
                     </Link>
                  ))
               )}
            </SettingsCard>
         </SettingsSection>

         {workspace.configured && !canAdmin && (
            <p className="text-sm text-muted-foreground">Only workspace owners and admins can create teams or change membership.</p>
         )}
      </SettingsShell>
   );
}
