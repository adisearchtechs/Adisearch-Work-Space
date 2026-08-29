'use client';

import { createContext, useContext } from 'react';
import type { WorkspaceSession } from '@/lib/workspace';

const WorkspaceContext = createContext<WorkspaceSession | null>(null);

export function WorkspaceProvider({
   value,
   children,
}: {
   value: WorkspaceSession;
   children: React.ReactNode;
}) {
   return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
   const value = useContext(WorkspaceContext);

   if (!value) {
      throw new Error('useWorkspace must be used inside WorkspaceProvider.');
   }

   return value;
}
