'use client';

import type { WorkspaceMemberDto } from '@/lib/workspace-members/contracts';
import { useMembersFilterStore } from '@/store/members-filter-store';
import { useWorkspaceMembersStore } from '@/store/workspace-members-store';
import { ArrowDown } from 'lucide-react';
import { useMemo } from 'react';
import PersistentMemberLine from './persistent-member-line';

const roleLabel = (role: WorkspaceMemberDto['role']) =>
   role.charAt(0).toUpperCase() + role.slice(1);

export default function PersistentMembers() {
   const { members, loading } = useWorkspaceMembersStore();
   const { filters, sort } = useMembersFilterStore();

   const displayed = useMemo(() => {
      let list = members.slice();

      if (filters.role.length > 0) {
         const roles = new Set(filters.role);
         list = list.filter((member) => roles.has(roleLabel(member.role)));
      }

      return list.sort((a, b) => {
         switch (sort) {
            case 'name-asc':
               return a.displayName.localeCompare(b.displayName);
            case 'name-desc':
               return b.displayName.localeCompare(a.displayName);
            case 'joined-asc':
               return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
            case 'joined-desc':
               return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
            case 'teams-asc':
               return a.teamCount - b.teamCount;
            case 'teams-desc':
               return b.teamCount - a.teamCount;
            default:
               return 0;
         }
      });
   }, [filters.role, members, sort]);

   if (loading) {
      return <p className="px-6 py-8 text-sm text-muted-foreground">Loading workspace members…</p>;
   }

   return (
      <div className="w-full">
         <div className="bg-container px-6 py-1.5 text-sm flex items-center text-muted-foreground border-b sticky top-0 z-10">
            <div className="flex-1 min-w-0 flex items-center gap-1">
               Name
               <ArrowDown className="size-3" />
            </div>
            <div className="w-[110px] shrink-0">Role</div>
            <div className="hidden lg:block w-[100px] shrink-0">Joined</div>
            <div className="hidden md:block w-[170px] shrink-0">Teams</div>
            <div className="hidden sm:block w-[110px] shrink-0">Issues created</div>
         </div>

         {displayed.length > 0 ? (
            <div className="w-full">
               {displayed.map((member) => (
                  <PersistentMemberLine key={member.id} member={member} />
               ))}
            </div>
         ) : (
            <p className="px-6 py-8 text-sm text-muted-foreground">
               No workspace members match the current filters.
            </p>
         )}
      </div>
   );
}
