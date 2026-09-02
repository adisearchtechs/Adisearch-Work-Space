'use client';

import {
   Box,
   ChevronRight,
   CopyMinus,
   Eye,
   FileText,
   Home,
   Link as LinkIcon,
   MoreHorizontal,
   Settings,
   Users,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { RiDonutChartFill } from '@remixicon/react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
   SidebarGroup,
   SidebarGroupLabel,
   SidebarMenu,
   SidebarMenuAction,
   SidebarMenuButton,
   SidebarMenuItem,
   SidebarMenuSub,
   SidebarMenuSubButton,
   SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { teams as demoTeams } from '@/mock-data/teams';
import { useTeamsStore } from '@/store/teams-store';

export function NavTeams() {
   const { orgId } = useParams<{ orgId: string }>();
   const workspace = useWorkspace();
   const teams = useTeamsStore((state) => state.teams);
   const joinedTeamIds = useTeamsStore((state) => state.joinedTeamIds);
   const loading = useTeamsStore((state) => state.loading);
   const workspaceSlug = useTeamsStore((state) => state.workspaceSlug);
   const joinedSet = useMemo(() => new Set(joinedTeamIds), [joinedTeamIds]);
   const configuredReady =
      workspace.configured && workspaceSlug === workspace.organization.slug && !loading;
   const runtimeTeams = configuredReady ? teams.filter((team) => joinedSet.has(team.id)) : [];
   const joinedDemoTeams = demoTeams.filter((team) => team.joined);

   if (workspace.configured) {
      return (
         <SidebarGroup>
            <SidebarGroupLabel>Your teams</SidebarGroupLabel>
            <SidebarMenu>
               {!configuredReady ? (
                  <SidebarMenuItem>
                     <SidebarMenuButton disabled>
                        <span className="text-sm text-muted-foreground">Loading teams…</span>
                     </SidebarMenuButton>
                  </SidebarMenuItem>
               ) : runtimeTeams.length === 0 ? (
                  <SidebarMenuItem>
                     <SidebarMenuButton asChild>
                        <Link href={`/${orgId}/settings/teams/new`}>
                           <Settings className="size-4" />
                           <span>Manage teams</span>
                        </Link>
                     </SidebarMenuButton>
                  </SidebarMenuItem>
               ) : (
                  runtimeTeams.map((team, index) => (
                     <Collapsible
                        key={team.id}
                        asChild
                        defaultOpen={index === 0}
                        className="group/collapsible"
                     >
                        <SidebarMenuItem>
                           <CollapsibleTrigger asChild>
                              <SidebarMenuButton tooltip={team.name}>
                                 <span className="size-3.5 shrink-0 rounded-sm border" style={{ backgroundColor: team.color }} aria-hidden="true" />
                                 <span className="text-sm truncate">{team.name}</span>
                                 <span className="w-3 shrink-0"><ChevronRight className="w-full transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" /></span>
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                       <SidebarMenuAction asChild showOnHover><div><MoreHorizontal /><span className="sr-only">More</span></div></SidebarMenuAction>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-48 rounded-lg" side="right" align="start">
                                       <DropdownMenuItem asChild><Link href={`/${orgId}/settings/teams/${team.id}`}><Settings className="size-4" /><span>Team settings</span></Link></DropdownMenuItem>
                                       <DropdownMenuItem onSelect={() => {
                                          const url = `${window.location.origin}/${orgId}/team/${team.key}/overview`;
                                          void navigator.clipboard.writeText(url).then(() => toast.success('Team link copied.')).catch(() => toast.error('Unable to copy team link.'));
                                       }}><LinkIcon className="size-4" /><span>Copy link</span></DropdownMenuItem>
                                    </DropdownMenuContent>
                                 </DropdownMenu>
                              </SidebarMenuButton>
                           </CollapsibleTrigger>
                           <CollapsibleContent>
                              <SidebarMenuSub>
                                 <SidebarMenuSubItem><SidebarMenuSubButton asChild><Link href={`/${orgId}/team/${team.key}/overview`}><Home size={14} /><span>Home</span></Link></SidebarMenuSubButton></SidebarMenuSubItem>
                                 <SidebarMenuSubItem><SidebarMenuSubButton asChild><Link href={`/${orgId}/team/${team.key}/all`}><CopyMinus size={14} /><span>Issues</span></Link></SidebarMenuSubButton></SidebarMenuSubItem>
                                 <SidebarMenuSubItem><SidebarMenuSubButton asChild><Link href={`/${orgId}/team/${team.key}/cycles`}><RiDonutChartFill size={14} /><span>Cycles</span></Link></SidebarMenuSubButton></SidebarMenuSubItem>
                                 <SidebarMenuSubItem><SidebarMenuSubButton asChild><Link href={`/${orgId}/team/${team.key}/projects`}><Box size={14} /><span>Projects</span></Link></SidebarMenuSubButton></SidebarMenuSubItem>
                                 <SidebarMenuSubItem><SidebarMenuSubButton asChild><Link href={`/${orgId}/team/${team.key}/views`}><Eye size={14} /><span>Views</span></Link></SidebarMenuSubButton></SidebarMenuSubItem>
                                 <SidebarMenuSubItem><SidebarMenuSubButton asChild><Link href={`/${orgId}/team/${team.key}/documents`}><FileText size={14} /><span>Documents</span></Link></SidebarMenuSubButton></SidebarMenuSubItem>
                                 <SidebarMenuSubItem><SidebarMenuSubButton asChild><Link href={`/${orgId}/team/${team.key}/members`}><Users size={14} /><span>Members</span></Link></SidebarMenuSubButton></SidebarMenuSubItem>
                              </SidebarMenuSub>
                           </CollapsibleContent>
                        </SidebarMenuItem>
                     </Collapsible>
                  ))
               )}
            </SidebarMenu>
         </SidebarGroup>
      );
   }

   return (
      <SidebarGroup>
         <SidebarGroupLabel>Your teams</SidebarGroupLabel>
         <SidebarMenu>
            {joinedDemoTeams.map((team, index) => (
               <Collapsible key={team.name} asChild defaultOpen={index === 0} className="group/collapsible">
                  <SidebarMenuItem>
                     <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={team.name}>
                           <div className="inline-flex size-6 bg-muted/50 items-center justify-center rounded shrink-0"><div className="text-sm">{team.icon}</div></div>
                           <span className="text-sm">{team.name}</span>
                           <span className="w-3 shrink-0"><ChevronRight className="w-full transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" /></span>
                        </SidebarMenuButton>
                     </CollapsibleTrigger>
                     <CollapsibleContent>
                        <SidebarMenuSub>
                           <SidebarMenuSubItem><SidebarMenuSubButton asChild><Link href={`/${orgId}/team/${team.id}/overview`}><Home size={14} /><span>Home</span></Link></SidebarMenuSubButton></SidebarMenuSubItem>
                           <SidebarMenuSubItem><SidebarMenuSubButton asChild><Link href={`/${orgId}/team/${team.id}/all`}><CopyMinus size={14} /><span>Issues</span></Link></SidebarMenuSubButton></SidebarMenuSubItem>
                           <SidebarMenuSubItem><SidebarMenuSubButton asChild><Link href={`/${orgId}/team/${team.id}/cycles`}><RiDonutChartFill size={14} /><span>Cycles</span></Link></SidebarMenuSubButton></SidebarMenuSubItem>
                           <SidebarMenuSubItem><SidebarMenuSubButton asChild><Link href={`/${orgId}/team/${team.id}/projects`}><Box size={14} /><span>Projects</span></Link></SidebarMenuSubButton></SidebarMenuSubItem>
                           <SidebarMenuSubItem><SidebarMenuSubButton asChild><Link href={`/${orgId}/team/${team.id}/views`}><Eye size={14} /><span>Views</span></Link></SidebarMenuSubButton></SidebarMenuSubItem>
                           <SidebarMenuSubItem><SidebarMenuSubButton asChild><Link href={`/${orgId}/team/${team.id}/documents`}><FileText size={14} /><span>Documents</span></Link></SidebarMenuSubButton></SidebarMenuSubItem>
                           <SidebarMenuSubItem><SidebarMenuSubButton asChild><Link href={`/${orgId}/team/${team.id}/members`}><Users size={14} /><span>Members</span></Link></SidebarMenuSubButton></SidebarMenuSubItem>
                        </SidebarMenuSub>
                     </CollapsibleContent>
                  </SidebarMenuItem>
               </Collapsible>
            ))}
         </SidebarMenu>
      </SidebarGroup>
   );
}
