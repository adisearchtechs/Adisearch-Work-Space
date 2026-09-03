'use client';

import { useWorkspace } from '@/components/providers/workspace-provider';
import Members from './members';
import PersistentMembers from './persistent-members';

export default function MembersRuntime() {
   const workspace = useWorkspace();
   return workspace.configured ? <PersistentMembers /> : <Members />;
}
