'use client';

import { useEffect, useState } from 'react';
import { CheckIcon, CircleUserRound, Send, UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWorkspace } from '@/components/providers/workspace-provider';
import type { WorkspaceMemberDto } from '@/lib/workspace-members/contracts';
import { statusUserColors, type User, users } from '@/mock-data/users';
import { useIssuesStore } from '@/store/issues-store';
import { toast } from 'sonner';

interface AssigneeUserProps {
   user: User | null;
   issueId?: string;
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
      role: 'Member',
      joinedDate: member.joinedAt,
      teamIds: [],
      timezone: 'UTC',
   };
}

export function AssigneeUser({ user, issueId }: AssigneeUserProps) {
   const workspace = useWorkspace();
   const updateIssueAssignee = useIssuesStore((state) => state.updateIssueAssignee);
   const [open, setOpen] = useState(false);
   const [currentAssignee, setCurrentAssignee] = useState<User | null>(user);
   const [members, setMembers] = useState<User[]>([]);
   const [loadingMembers, setLoadingMembers] = useState(false);

   useEffect(() => {
      setCurrentAssignee(user);
   }, [user]);

   useEffect(() => {
      if (!open || !workspace.configured) return;
      const controller = new AbortController();
      setLoadingMembers(true);
      void fetch(`/api/members?organization=${encodeURIComponent(workspace.organization.slug)}`, {
         credentials: 'same-origin',
         signal: controller.signal,
         headers: { Accept: 'application/json' },
      })
         .then(async (response) => {
            if (!response.ok) throw new Error(`Member load failed with ${response.status}.`);
            return (await response.json()) as { members: WorkspaceMemberDto[] };
         })
         .then(({ members: workspaceMembers }) => {
            if (controller.signal.aborted) return;
            setMembers(workspaceMembers.map(memberToUser));
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            toast.error('Unable to load workspace members.');
         })
         .finally(() => {
            if (!controller.signal.aborted) setLoadingMembers(false);
         });
      return () => controller.abort();
   }, [open, workspace.configured, workspace.organization.slug]);

   const chooseAssignee = (nextAssignee: User | null) => {
      setCurrentAssignee(nextAssignee);
      setOpen(false);
      if (workspace.configured && issueId) {
         updateIssueAssignee(issueId, nextAssignee);
      }
   };

   const directory = workspace.configured
      ? members
      : users.filter((candidate) => candidate.teamIds.includes('CORE'));

   const renderAvatar = () => {
      if (currentAssignee) {
         return (
            <Avatar className="size-6 shrink-0">
               <AvatarImage src={currentAssignee.avatarUrl} alt={currentAssignee.name} />
               <AvatarFallback>{currentAssignee.name[0]}</AvatarFallback>
            </Avatar>
         );
      }
      return (
         <div className="size-6 flex items-center justify-center">
            <CircleUserRound className="size-5 text-zinc-600" />
         </div>
      );
   };

   return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
         <DropdownMenuTrigger asChild>
            <button className="relative w-fit focus:outline-none">
               {renderAvatar()}
               {currentAssignee && (
                  <span
                     className="border-background absolute -end-0.5 -bottom-0.5 size-2.5 rounded-full border-2"
                     style={{ backgroundColor: statusUserColors[currentAssignee.status] }}
                  >
                     <span className="sr-only">{currentAssignee.status}</span>
                  </span>
               )}
            </button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="start" className="w-[240px]">
            <DropdownMenuLabel>Assign to...</DropdownMenuLabel>
            <DropdownMenuItem
               onClick={(event) => {
                  event.stopPropagation();
                  chooseAssignee(null);
               }}
            >
               <div className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  <span>No assignee</span>
               </div>
               {!currentAssignee && <CheckIcon className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {workspace.configured && loadingMembers ? (
               <DropdownMenuItem disabled>Loading members…</DropdownMenuItem>
            ) : directory.length === 0 ? (
               <DropdownMenuItem disabled>No workspace members available</DropdownMenuItem>
            ) : (
               directory.map((candidate) => (
                  <DropdownMenuItem
                     key={candidate.id}
                     onClick={(event) => {
                        event.stopPropagation();
                        chooseAssignee(candidate);
                     }}
                  >
                     <div className="flex min-w-0 items-center gap-2">
                        <Avatar className="h-5 w-5 shrink-0">
                           <AvatarImage src={candidate.avatarUrl} alt={candidate.name} />
                           <AvatarFallback>{candidate.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="truncate">{candidate.name}</span>
                     </div>
                     {currentAssignee?.id === candidate.id && <CheckIcon className="ml-auto h-4 w-4" />}
                  </DropdownMenuItem>
               ))
            )}
            {!workspace.configured && (
               <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>New user</DropdownMenuLabel>
                  <DropdownMenuItem>
                     <div className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        <span>Invite and assign...</span>
                     </div>
                  </DropdownMenuItem>
               </>
            )}
         </DropdownMenuContent>
      </DropdownMenu>
   );
}
