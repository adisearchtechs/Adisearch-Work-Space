'use client';

import { Button } from '@/components/ui/button';
import {
   Command,
   CommandEmpty,
   CommandGroup,
   CommandInput,
   CommandItem,
   CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useWorkspace } from '@/components/providers/workspace-provider';
import type { WorkspaceMemberDto } from '@/lib/workspace-members/contracts';
import { useIssuesStore } from '@/store/issues-store';
import { User, users as demoUsers } from '@/mock-data/users';
import { CheckIcon, UserCircle } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AssigneeSelectorProps {
   assignee: User | null;
   onChange: (assignee: User | null) => void;
}

function memberToUser(member: WorkspaceMemberDto): User {
   return {
      id: member.id,
      name: member.displayName,
      avatarUrl:
         member.avatarUrl ??
         `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(member.id)}`,
      email: '',
      status: 'offline',
      role:
         member.role === 'owner' || member.role === 'admin'
            ? 'Admin'
            : member.role === 'guest'
              ? 'Guest'
              : 'Member',
      joinedDate: member.joinedAt,
      teamIds: [],
      timezone: 'UTC',
   };
}

export function AssigneeSelector({ assignee, onChange }: AssigneeSelectorProps) {
   const id = useId();
   const workspace = useWorkspace();
   const [open, setOpen] = useState(false);
   const [value, setValue] = useState<string | null>(assignee?.id || null);
   const [members, setMembers] = useState<WorkspaceMemberDto[]>([]);
   const [loading, setLoading] = useState(false);
   const filterByAssignee = useIssuesStore((state) => state.filterByAssignee);

   useEffect(() => {
      setValue(assignee?.id || null);
   }, [assignee]);

   useEffect(() => {
      if (!workspace.configured || !open) return;
      const controller = new AbortController();
      setLoading(true);
      void fetch(`/api/members?organization=${encodeURIComponent(workspace.organization.slug)}`, {
         credentials: 'same-origin',
         signal: controller.signal,
         headers: { Accept: 'application/json' },
      })
         .then(async (response) => {
            if (!response.ok) throw new Error(`Member load failed with ${response.status}.`);
            return (await response.json()) as { members: WorkspaceMemberDto[] };
         })
         .then((result) => {
            if (!controller.signal.aborted) setMembers(result.members);
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            if (!controller.signal.aborted) setMembers([]);
         })
         .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
         });
      return () => controller.abort();
   }, [open, workspace.configured, workspace.organization.slug]);

   const availableUsers = useMemo(
      () =>
         workspace.configured
            ? members.map(memberToUser)
            : demoUsers.filter((user) => user.teamIds.includes('CORE')),
      [members, workspace.configured]
   );
   const selectedUser = availableUsers.find((user) => user.id === value) ?? assignee;

   const handleAssigneeChange = (userId: string) => {
      if (userId === 'unassigned') {
         setValue(null);
         onChange(null);
      } else {
         const newAssignee = availableUsers.find((user) => user.id === userId);
         if (newAssignee) {
            setValue(userId);
            onChange(newAssignee);
         }
      }
      setOpen(false);
   };

   return (
      <div className="*:not-first:mt-2">
         <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
               <Button
                  id={id}
                  className="flex items-center justify-center"
                  size="xs"
                  variant="secondary"
                  role="combobox"
                  aria-expanded={open}
               >
                  {selectedUser ? (
                     <Avatar className="size-5">
                        <AvatarImage src={selectedUser.avatarUrl} alt={selectedUser.name} />
                        <AvatarFallback>{selectedUser.name.charAt(0)}</AvatarFallback>
                     </Avatar>
                  ) : (
                     <UserCircle className="size-5" />
                  )}
                  <span>{selectedUser?.name ?? 'Unassigned'}</span>
               </Button>
            </PopoverTrigger>
            <PopoverContent
               className="border-input w-full min-w-[var(--radix-popper-anchor-width)] p-0"
               align="start"
            >
               <Command>
                  <CommandInput placeholder="Assign to..." />
                  <CommandList>
                     <CommandEmpty>{loading ? 'Loading members…' : 'No users found.'}</CommandEmpty>
                     <CommandGroup>
                        <CommandItem
                           value="unassigned"
                           onSelect={() => handleAssigneeChange('unassigned')}
                           className="flex items-center justify-between"
                        >
                           <div className="flex items-center gap-2">
                              <UserCircle className="size-5" />
                              Unassigned
                           </div>
                           {value === null && <CheckIcon size={16} className="ml-auto" />}
                           <span className="text-muted-foreground text-xs">
                              {filterByAssignee(null).length}
                           </span>
                        </CommandItem>
                        {availableUsers.map((user) => (
                           <CommandItem
                              key={user.id}
                              value={`${user.name} ${user.id}`}
                              onSelect={() => handleAssigneeChange(user.id)}
                              className="flex items-center justify-between"
                           >
                              <div className="flex items-center gap-2">
                                 <Avatar className="size-5">
                                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                 </Avatar>
                                 {user.name}
                              </div>
                              {value === user.id && <CheckIcon size={16} className="ml-auto" />}
                              <span className="text-muted-foreground text-xs">
                                 {filterByAssignee(user.id).length}
                              </span>
                           </CommandItem>
                        ))}
                     </CommandGroup>
                  </CommandList>
               </Command>
            </PopoverContent>
         </Popover>
      </div>
   );
}