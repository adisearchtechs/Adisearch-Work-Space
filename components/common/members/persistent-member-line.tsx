'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { WorkspaceMemberDto } from '@/lib/workspace-members/contracts';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { SquareUser } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const roleLabel = (role: WorkspaceMemberDto['role']) =>
   role.charAt(0).toUpperCase() + role.slice(1);

const joinedLabel = (iso: string) => {
   const date = parseISO(iso);
   return date.getFullYear() === new Date().getFullYear()
      ? format(date, 'MMM d')
      : format(date, 'MMM yyyy');
};

export default function PersistentMemberLine({ member }: { member: WorkspaceMemberDto }) {
   const { orgId } = useParams<{ orgId: string }>();

   return (
      <Link
         href={`/${orgId}/profiles/${member.id}`}
         className="w-full flex items-center py-2.5 px-6 border-b hover:bg-sidebar/50 border-muted-foreground/5 text-sm last:border-b-0"
      >
         <div className="flex-1 min-w-0 flex items-center gap-2.5">
            <Avatar className="size-8 shrink-0">
               {member.avatarUrl && (
                  <AvatarImage src={member.avatarUrl} alt={member.displayName} />
               )}
               <AvatarFallback>{member.displayName[0] ?? '?'}</AvatarFallback>
            </Avatar>
            <span className="font-medium truncate">{member.displayName}</span>
         </div>

         <div className="w-[110px] shrink-0">
            <span
               className={cn(
                  'inline-flex items-center text-xs border rounded-md px-1.5 py-0.5',
                  member.role === 'owner' || member.role === 'admin'
                     ? 'text-indigo-500 dark:text-indigo-400 border-indigo-500/30 bg-indigo-500/5'
                     : 'text-muted-foreground'
               )}
            >
               {roleLabel(member.role)}
            </span>
         </div>

         <div className="hidden lg:block w-[100px] shrink-0 text-xs text-muted-foreground">
            {joinedLabel(member.joinedAt)}
         </div>

         <div className="hidden md:flex w-[170px] shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            {member.teamCount > 0 ? (
               <>
                  <SquareUser className="size-3.5 shrink-0" />
                  <span>
                     {member.teamCount} {member.teamCount === 1 ? 'team' : 'teams'}
                  </span>
               </>
            ) : (
               <span>—</span>
            )}
         </div>

         <div className="hidden sm:block w-[110px] shrink-0 text-xs text-muted-foreground">
            {member.createdIssueCount}
         </div>
      </Link>
   );
}
