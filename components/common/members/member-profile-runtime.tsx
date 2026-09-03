'use client';

import Header from '@/components/layout/headers/profile/header';
import MainLayout from '@/components/layout/main-layout';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { users } from '@/mock-data/users';
import { useWorkspaceMembersStore } from '@/store/workspace-members-store';
import MemberProfile from './member-profile';
import PersistentMemberProfile from './persistent-member-profile';

export default function MemberProfileRuntime({ memberId }: { memberId: string }) {
   const workspace = useWorkspace();
   const members = useWorkspaceMembersStore((state) => state.members);
   const loading = useWorkspaceMembersStore((state) => state.loading);

   if (!workspace.configured) {
      const member = users.find((candidate) => candidate.id === memberId);
      if (!member) {
         return (
            <MainLayout>
               <p className="px-6 py-8 text-sm text-muted-foreground">Demo member not found.</p>
            </MainLayout>
         );
      }
      return (
         <MainLayout header={<Header member={member} />}>
            <MemberProfile member={member} />
         </MainLayout>
      );
   }

   if (loading) {
      return (
         <MainLayout>
            <p className="px-6 py-8 text-sm text-muted-foreground">Loading workspace member…</p>
         </MainLayout>
      );
   }

   const member = members.find((candidate) => candidate.id === memberId);
   if (!member) {
      return (
         <MainLayout>
            <p className="px-6 py-8 text-sm text-muted-foreground">Workspace member not found.</p>
         </MainLayout>
      );
   }

   return (
      <MainLayout header={<Header member={member} />}>
         <PersistentMemberProfile member={member} />
      </MainLayout>
   );
}
