'use client';

import Header from '@/components/layout/headers/initiative/header';
import { PersistentInitiativeHeader } from '@/components/layout/headers/initiative/persistent-header';
import { useWorkspace } from '@/components/providers/workspace-provider';

export function InitiativeHeaderRoot() {
   const workspace = useWorkspace();
   return workspace.configured ? <PersistentInitiativeHeader /> : <Header />;
}
