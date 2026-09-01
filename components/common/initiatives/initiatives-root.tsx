'use client';

import Initiatives from '@/components/common/initiatives/initiatives';
import { PersistentInitiatives } from '@/components/common/initiatives/persistent-initiatives';
import { useWorkspace } from '@/components/providers/workspace-provider';

export function InitiativesRoot() {
   const workspace = useWorkspace();
   return workspace.configured ? <PersistentInitiatives /> : <Initiatives />;
}
