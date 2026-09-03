'use client';

import { useWorkspace } from '@/components/providers/workspace-provider';
import { Button } from '@/components/ui/button';
import {
   Command,
   CommandGroup,
   CommandItem,
   CommandList,
   CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
   type MembersRoleFilter,
   useMembersFilterStore,
} from '@/store/members-filter-store';
import { useState } from 'react';
import { ArrowUpDown, CheckIcon, ChevronRight, ListFilter, Shield } from 'lucide-react';

type FilterType = 'role' | 'sort';

const DEMO_ROLES: MembersRoleFilter[] = ['Guest', 'Member', 'Admin', 'Application'];
const PERSISTENT_ROLES: MembersRoleFilter[] = ['Owner', 'Admin', 'Member', 'Guest'];

export function Filter() {
   const workspace = useWorkspace();
   const [open, setOpen] = useState(false);
   const [active, setActive] = useState<FilterType | null>(null);
   const roles = workspace.configured ? PERSISTENT_ROLES : DEMO_ROLES;

   const { filters, sort, toggleFilter, clearFilters, getActiveFiltersCount, setSort } =
      useMembersFilterStore();

   return (
      <Popover open={open} onOpenChange={setOpen}>
         <PopoverTrigger asChild>
            <Button size="xs" variant="ghost" className="relative">
               <ListFilter className="size-4 mr-1" />
               Filter
               {getActiveFiltersCount() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full size-4 flex items-center justify-center">
                     {getActiveFiltersCount()}
                  </span>
               )}
            </Button>
         </PopoverTrigger>
         <PopoverContent className="p-0 w-60" align="start">
            {active === null ? (
               <Command>
                  <CommandList>
                     <CommandGroup>
                        <CommandItem
                           onSelect={() => setActive('role')}
                           className="flex items-center justify-between cursor-pointer"
                        >
                           <span className="flex items-center gap-2">
                              <Shield className="size-4 text-muted-foreground" />
                              Role
                           </span>
                           <div className="flex items-center">
                              {filters.role.length > 0 && (
                                 <span className="text-xs text-muted-foreground mr-1">
                                    {filters.role.length}
                                 </span>
                              )}
                              <ChevronRight className="size-4" />
                           </div>
                        </CommandItem>
                        <CommandItem
                           onSelect={() => setActive('sort')}
                           className="flex items-center justify-between cursor-pointer"
                        >
                           <span className="flex items-center gap-2">
                              <ArrowUpDown className="size-4 text-muted-foreground" />
                              Sort by
                           </span>
                           <ChevronRight className="size-4" />
                        </CommandItem>
                     </CommandGroup>
                     {getActiveFiltersCount() > 0 && (
                        <>
                           <CommandSeparator />
                           <CommandGroup>
                              <CommandItem
                                 onSelect={() => clearFilters()}
                                 className="cursor-pointer"
                              >
                                 Clear all filters
                              </CommandItem>
                           </CommandGroup>
                        </>
                     )}
                  </CommandList>
               </Command>
            ) : active === 'role' ? (
               <Command>
                  <div className="flex items-center border-b p-2">
                     <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => setActive(null)}
                     >
                        <ChevronRight className="size-4 rotate-180" />
                     </Button>
                     <span className="ml-2 font-medium">Role</span>
                  </div>
                  <CommandList>
                     <CommandGroup>
                        {roles.map((role) => (
                           <CommandItem
                              key={role}
                              value={role}
                              onSelect={() => toggleFilter('role', role)}
                              className="flex items-center justify-between"
                           >
                              {role}
                              {filters.role.includes(role) && <CheckIcon size={16} />}
                           </CommandItem>
                        ))}
                     </CommandGroup>
                  </CommandList>
               </Command>
            ) : (
               <Command>
                  <div className="flex items-center border-b p-2">
                     <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => setActive(null)}
                     >
                        <ChevronRight className="size-4 rotate-180" />
                     </Button>
                     <span className="ml-2 font-medium">Sort by</span>
                  </div>
                  <CommandList>
                     <CommandGroup heading="Name">
                        <CommandItem onSelect={() => setSort('name-asc')}>
                           A → Z{sort === 'name-asc' && <CheckIcon size={16} className="ml-auto" />}
                        </CommandItem>
                        <CommandItem onSelect={() => setSort('name-desc')}>
                           Z → A{sort === 'name-desc' && <CheckIcon size={16} className="ml-auto" />}
                        </CommandItem>
                     </CommandGroup>
                     <CommandSeparator />
                     <CommandGroup heading="Joined">
                        <CommandItem onSelect={() => setSort('joined-asc')}>
                           Oldest to Newest
                           {sort === 'joined-asc' && <CheckIcon size={16} className="ml-auto" />}
                        </CommandItem>
                        <CommandItem onSelect={() => setSort('joined-desc')}>
                           Newest to Oldest
                           {sort === 'joined-desc' && <CheckIcon size={16} className="ml-auto" />}
                        </CommandItem>
                     </CommandGroup>
                     <CommandSeparator />
                     <CommandGroup heading="Teams">
                        <CommandItem onSelect={() => setSort('teams-asc')}>
                           Lowest to Highest
                           {sort === 'teams-asc' && <CheckIcon size={16} className="ml-auto" />}
                        </CommandItem>
                        <CommandItem onSelect={() => setSort('teams-desc')}>
                           Highest to Lowest
                           {sort === 'teams-desc' && <CheckIcon size={16} className="ml-auto" />}
                        </CommandItem>
                     </CommandGroup>
                  </CommandList>
               </Command>
            )}
         </PopoverContent>
      </Popover>
   );
}
