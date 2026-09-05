'use client';

import AgentChat from '@/components/common/agent/agent-chat';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Bot } from 'lucide-react';

export default function AgentRuntime() {
   const workspace = useWorkspace();

   if (!workspace.configured) return <AgentChat />;

   return (
      <div className="flex h-full w-full items-center justify-center px-6">
         <div className="max-w-lg rounded-xl border bg-container p-8 text-center">
            <div className="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-full border bg-muted/30">
               <Bot className="size-6 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-semibold">Adisearch Agent is not connected yet</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
               The production workspace does not currently have a live AI provider, tool-execution
               policy, or persisted agent runtime. The deterministic demo agent is intentionally
               hidden here so configured workspaces never present canned responses as real AI.
            </p>
         </div>
      </div>
   );
}
