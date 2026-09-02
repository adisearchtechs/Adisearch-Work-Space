'use client';

import { useWorkspace } from '@/components/providers/workspace-provider';
import DemoViews from '@/components/common/views/views';
import PersistentViews from '@/components/common/views/persistent-views';

export default function ViewsRuntime({ teamId }: { teamId?: string }) {
   const workspace = useWorkspace();
   return workspace.configured ? <PersistentViews teamId={teamId} /> : <DemoViews teamId={teamId} />;
}
