'use client';

import Inbox from '@/components/common/inbox/inbox';
import PersistentInbox from '@/components/common/inbox/persistent-inbox';
import { useWorkspace } from '@/components/providers/workspace-provider';

export default function InboxRuntime() {
   const workspace = useWorkspace();
   return workspace.configured ? <PersistentInbox /> : <Inbox />;
}
