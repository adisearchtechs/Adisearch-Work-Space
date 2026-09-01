'use client';

import * as React from 'react';
import Image from 'next/image';
import { ChevronsUpDown } from 'lucide-react';

import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuGroup,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuPortal,
   DropdownMenuSeparator,
   DropdownMenuShortcut,
   DropdownMenuSub,
   DropdownMenuSubContent,
   DropdownMenuSubTrigger,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { CreateIssueTrigger } from './create-new-issue';
import { ThemeToggle } from '../theme-toggle';
import Link from 'next/link';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { brand } from '@/lib/brand';

export function OrgSwitcher() {
   const { organization, user, configured } = useWorkspace();
   const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);

   return (
      <SidebarMenu>
         <SidebarMenuItem>
            <DropdownMenu>
               <div className="w-full flex gap-1 items-center pt-2">
                  <DropdownMenuTrigger asChild>
                     <SidebarMenuButton
                        size="lg"
                        className="h-10 p-1 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                     >
                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg border bg-background/80 p-0.5 shadow-sm">
                           <Image
                              src={brand.logoPath}
                              alt="Adisearch"
                              width={32}
                              height={32}
                              unoptimized
                              className="size-7 object-contain"
                           />
                        </div>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                           <span className="truncate font-semibold">{organization.name}</span>
                           <span className="truncate text-xs text-muted-foreground">
                              {user.displayName} · {roleLabel}
                           </span>
                        </div>
                        <ChevronsUpDown className="ml-auto" />
                     </SidebarMenuButton>
                  </DropdownMenuTrigger>

                  <ThemeToggle />
                  <CreateIssueTrigger />
               </div>
               <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-60 rounded-lg"
                  side="bottom"
                  align="end"
                  sideOffset={4}
               >
                  <DropdownMenuLabel className="flex items-center gap-2">
                     <Image
                        src={brand.logoPath}
                        alt=""
                        width={28}
                        height={28}
                        unoptimized
                        className="size-7 object-contain"
                     />
                     <div className="min-w-0">
                        <div className="truncate font-medium">{user.displayName}</div>
                        <div className="truncate text-xs font-normal text-muted-foreground">
                           {user.email}
                        </div>
                     </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                     <DropdownMenuItem asChild>
                        <Link href={`/${organization.slug}/settings/profile`}>My profile</Link>
                     </DropdownMenuItem>
                     <DropdownMenuItem asChild>
                        <Link href={`/${organization.slug}/settings`}>
                           Workspace settings
                           <DropdownMenuShortcut>G then S</DropdownMenuShortcut>
                        </Link>
                     </DropdownMenuItem>
                     <DropdownMenuItem>Invite and manage members</DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                     <DropdownMenuItem>Download desktop app</DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                     <DropdownMenuSubTrigger>Switch workspace</DropdownMenuSubTrigger>
                     <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                           <DropdownMenuLabel>{user.displayName}</DropdownMenuLabel>
                           <DropdownMenuSeparator />
                           <DropdownMenuItem>
                              <Image
                                 src={brand.logoPath}
                                 alt=""
                                 width={24}
                                 height={24}
                                 unoptimized
                                 className="size-6 object-contain"
                              />
                              {organization.name}
                           </DropdownMenuItem>
                           <DropdownMenuSeparator />
                           <DropdownMenuItem>Create or join workspace</DropdownMenuItem>
                           <DropdownMenuItem>Add an account</DropdownMenuItem>
                        </DropdownMenuSubContent>
                     </DropdownMenuPortal>
                  </DropdownMenuSub>
                  {configured && (
                     <DropdownMenuItem asChild>
                        <form action="/auth/signout" method="post" className="w-full">
                           <button type="submit" className="flex w-full items-center text-left">
                              Log out
                              <DropdownMenuShortcut>⌥⇧Q</DropdownMenuShortcut>
                           </button>
                        </form>
                     </DropdownMenuItem>
                  )}
               </DropdownMenuContent>
            </DropdownMenu>
         </SidebarMenuItem>
      </SidebarMenu>
   );
}
