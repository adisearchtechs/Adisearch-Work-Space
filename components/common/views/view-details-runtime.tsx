'use client';

import { useWorkspace } from '@/components/providers/workspace-provider';
import DemoViewDetails from '@/components/common/views/view-details';
import PersistentViewDetails from '@/components/common/views/persistent-view-details';

export default function ViewDetailsRuntime({ viewId }: { viewId: string }) {
   const workspace = useWorkspace();
   return workspace.configured ? (
      <PersistentViewDetails viewId={viewId} />
   ) : (
      <DemoViewDetails viewId={viewId} />
   );
}
