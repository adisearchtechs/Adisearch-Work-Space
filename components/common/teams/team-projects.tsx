'use client';

import Projects from '@/components/common/projects/projects';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { resolveTeamReference, useTeamsStore } from '@/store/teams-store';

export default function TeamProjects({ teamId }: { teamId: string }) {
   const workspace = useWorkspace();
   const teams = useTeamsStore((state) => state.teams);
   const workspaceSlug = useTeamsStore((state) => state.workspaceSlug);
   const loading = useTeamsStore((state) => state.loading);

   if (!workspace.configured) return <Projects teamId={teamId} />;
   if (loading || workspaceSlug !== workspace.organization.slug) {
      return <div className="flex h-full items-center justify-center text-sm text-muted-foreground" role="status">Loading team projects…</div>;
   }

   const team = resolveTeamReference(teams, teamId);
   if (!team) {
      return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Team not found.</div>;
   }
   return <Projects teamId={team.key} />;
}
