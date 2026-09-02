'use client';

import { useWorkspace } from '@/components/providers/workspace-provider';
import DemoHeader from '@/components/layout/headers/view/header';
import PersistentViewHeader from '@/components/layout/headers/view/persistent-header';

export default function ViewHeaderRuntime() {
   const workspace = useWorkspace();
   return workspace.configured ? <PersistentViewHeader /> : <DemoHeader />;
}
