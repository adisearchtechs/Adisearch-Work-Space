'use client';

import InitiativeDetails from '@/components/common/initiatives/initiative-details';
import { PersistentInitiativeDetails } from '@/components/common/initiatives/persistent-initiative-details';
import { useWorkspace } from '@/components/providers/workspace-provider';

export function InitiativeDetailsRoot({ initiativeId }: { initiativeId: string }) {
   const workspace = useWorkspace();
   return workspace.configured ? (
      <PersistentInitiativeDetails initiativeId={initiativeId} />
   ) : (
      <InitiativeDetails initiativeId={initiativeId} />
   );
}
