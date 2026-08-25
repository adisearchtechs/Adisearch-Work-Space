'use client';

import { RiGithubLine } from '@remixicon/react';
import * as React from 'react';

import { HelpButton } from '@/components/layout/sidebar/help-button';
import { NavInbox } from '@/components/layout/sidebar/nav-inbox';
import { NavTeams } from '@/components/layout/sidebar/nav-teams';
import { NavWorkspace } from '@/components/layout/sidebar/nav-workspace';
import { NavSettings } from '@/components/layout/sidebar/nav-settings';
import { NavTeamsSettings } from '@/components/layout/sidebar/nav-teams-settings';
import { OrgSwitcher } from '@/components/layout/sidebar/org-switcher';
import { Button } from '@/components/ui/button';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar';
import Link from 'next/link';
import { X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { BackToApp } from '@/components/layout/sidebar/back-to-app';
import { brand } from '@/lib/brand';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
   const [open, setOpen] = React.useState(true);
   const pathname = usePathname();
   const isSettings = pathname.includes('/settings');
   return (
      <Sidebar collapsible="offcanvas" {...props}>
         <SidebarHeader>{isSettings ? <BackToApp /> : <OrgSwitcher />}</SidebarHeader>
         <SidebarContent>
            {isSettings ? (
               <>
                  <NavSettings />
                  <NavTeamsSettings />
               </>
            ) : (
               <>
                  <NavInbox />
                  <NavWorkspace />
                  <NavTeams />
               </>
            )}
         </SidebarContent>
         <SidebarFooter>
            <div className="w-full flex flex-col gap-2">
               {open && (
                  <div className="group/sidebar relative flex flex-col gap-2 rounded-lg border p-4 text-sm w-full">
                     <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="absolute top-1.5 right-1.5 z-10 size-7"
                        onClick={() => setOpen(!open)}
                        aria-label="Dismiss promotion"
                     >
                        <X className="size-4" aria-hidden="true" />
                     </Button>
                     <div className="text-balance text-lg font-semibold leading-tight group-hover/sidebar:underline">
                        Plan clearly. Ship confidently.
                     </div>
                     <div>
                        Keep priorities, projects, and delivery decisions in one secure workspace.
                     </div>
                     <Button size="sm" className="w-full" asChild>
                        <Link href="/setup">Deployment status</Link>
                     </Button>
                  </div>
               )}
               <div className="w-full flex items-center justify-between">
                  <HelpButton />
                  <Button size="icon" variant="secondary" asChild>
                     <Link
                        href={brand.repositoryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${brand.name} repository on GitHub`}
                     >
                        <RiGithubLine className="size-4" aria-hidden="true" />
                     </Link>
                  </Button>
               </div>
            </div>
         </SidebarFooter>
      </Sidebar>
   );
}
