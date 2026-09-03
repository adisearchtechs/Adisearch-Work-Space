'use client';

import { InlineText } from '@/components/common/issues/details/content-blocks';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { agentExamples } from '@/mock-data/agent';
import { useAgentChatStore } from '@/store/agent-chat-store';
import { ArrowUp, Bot, ShieldCheck, UserRound, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

function AgentMessageBody({ content, streaming }: { content: string; streaming?: boolean }) {
   const lines = content.split('\n');
   return (
      <div className="text-sm leading-relaxed flex flex-col gap-1">
         {lines.map((line, index) => {
            const trimmed = line.trim();
            if (trimmed === '') return <span key={index} className="h-1.5" />;
            if (trimmed.startsWith('- ')) {
               return (
                  <span key={index} className="flex gap-2">
                     <span className="text-muted-foreground mt-[7px] size-1 rounded-full bg-muted-foreground shrink-0" />
                     <span>
                        <InlineText text={trimmed.slice(2)} />
                     </span>
                  </span>
               );
            }
            const numbered = trimmed.match(/^(\d+)\.\s+(.*)$/);
            if (numbered) {
               return (
                  <span key={index} className="flex gap-2">
                     <span className="text-muted-foreground tabular-nums">{numbered[1]}.</span>
                     <span>
                        <InlineText text={numbered[2]} />
                     </span>
                  </span>
               );
            }
            return (
               <span key={index}>
                  <InlineText text={trimmed} />
               </span>
            );
         })}
         {streaming && <span className="inline-block w-2 h-4 bg-foreground/60 animate-pulse" />}
      </div>
   );
}

function ChatComposer({
   onSend,
   autoFocus,
   large,
   disabled,
   placeholder,
}: {
   onSend: (input: string) => boolean;
   autoFocus?: boolean;
   large?: boolean;
   disabled?: boolean;
   placeholder: string;
}) {
   const [value, setValue] = useState('');

   const submit = () => {
      const input = value.trim();
      if (!input || disabled) return;
      if (onSend(input)) setValue('');
   };

   return (
      <div className={cn('w-full border rounded-xl bg-container shadow-xs', disabled && 'opacity-70')}>
         <textarea
            value={value}
            autoFocus={autoFocus && !disabled}
            disabled={disabled}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
               if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  submit();
               }
            }}
            placeholder={placeholder}
            className={cn(
               'w-full resize-none bg-transparent px-4 pt-3.5 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed',
               large ? 'min-h-16' : 'min-h-12'
            )}
         />
         <div className="flex items-center justify-between px-3 pb-2.5">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
               <ShieldCheck className="size-3.5" />
               Read-only workspace tools
            </span>
            <Button
               size="icon"
               className="size-7 rounded-full"
               onClick={submit}
               disabled={disabled || value.trim() === ''}
               aria-label="Send"
            >
               <ArrowUp className="size-4" />
            </Button>
         </div>
      </div>
   );
}

export default function AgentChat() {
   const workspace = useWorkspace();
   const {
      chats,
      activeChatId,
      sendMessage,
      connectPersistence,
      persistenceError,
      persistenceStatus,
      agentAvailability,
   } = useAgentChatStore();
   const [examplesDismissed, setExamplesDismissed] = useState(false);
   const scrollRef = useRef<HTMLDivElement>(null);

   const activeChat = chats.find((chat) => chat.id === activeChatId);

   useEffect(() => {
      connectPersistence(workspace.configured ? workspace.organization.slug : null);
   }, [connectPersistence, workspace.configured, workspace.organization.slug]);

   useEffect(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
   }, [activeChat?.messages]);

   const canSend = workspace.configured && agentAvailability?.available === true;
   const handleSend = (input: string) => Boolean(sendMessage(input));
   const availabilityMessage =
      persistenceStatus === 'loading' || agentAvailability === null
         ? 'Checking Agent availability…'
         : agentAvailability.available
           ? `Real AI enabled · ${agentAvailability.model} · read-only workspace access`
           : agentAvailability.reason;
   const composerPlaceholder = canSend ? 'Ask about your workspace…' : 'Agent unavailable';

   const status = (
      <div className="mt-2 flex flex-col gap-1 text-xs" role="status">
         <p className={canSend ? 'text-muted-foreground' : 'text-amber-700 dark:text-amber-400'}>
            {availabilityMessage}
         </p>
         {persistenceError && <p className="text-destructive">{persistenceError}</p>}
      </div>
   );

   if (!activeChat) {
      return (
         <div className="w-full h-full flex flex-col items-center overflow-y-auto">
            <div className="flex-1 w-full max-w-2xl px-6 flex flex-col justify-center pb-24">
               <div className="flex flex-col items-center text-center mb-8">
                  <span className="inline-flex size-16 items-center justify-center rounded-2xl border bg-container text-muted-foreground">
                     <Bot className="size-8" strokeWidth={1.5} />
                  </span>
                  <h1 className="mt-4 text-xl font-semibold">Workspace Agent</h1>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                     Ask questions grounded in your current issues, projects, milestones, cycles,
                     dependencies, documents, and reviews. R4A cannot modify workspace data.
                  </p>
               </div>

               <ChatComposer
                  onSend={handleSend}
                  autoFocus
                  large
                  disabled={!canSend}
                  placeholder={composerPlaceholder}
               />
               {status}

               {!examplesDismissed && (
                  <div className="mt-6">
                     <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-muted-foreground">Try a grounded question</span>
                        <button
                           type="button"
                           onClick={() => setExamplesDismissed(true)}
                           className="text-muted-foreground hover:text-foreground transition-colors"
                           aria-label="Dismiss examples"
                        >
                           <X className="size-4" />
                        </button>
                     </div>
                     <div className="grid sm:grid-cols-3 gap-3">
                        {agentExamples.map((example) => (
                           <button
                              key={example.id}
                              type="button"
                              disabled={!canSend}
                              onClick={() => handleSend(example.prompt)}
                              className="border rounded-lg p-4 text-left hover:bg-accent/40 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                           >
                              <example.icon className="size-4 text-muted-foreground" />
                              <p className="mt-6 text-sm font-medium">{example.title}</p>
                              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                                 {example.description}
                              </p>
                           </button>
                        ))}
                     </div>
                  </div>
               )}
            </div>
         </div>
      );
   }

   return (
      <div className="w-full h-full flex flex-col overflow-hidden">
         <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">
               {activeChat.messages.map((message) =>
                  message.role === 'user' ? (
                     <div key={message.id} className="flex justify-end">
                        <div className="flex items-start gap-2.5 max-w-[85%]">
                           <div className="rounded-2xl rounded-tr-sm bg-accent px-4 py-2.5 text-sm">
                              {message.content}
                           </div>
                           <span className="mt-1 inline-flex size-6 items-center justify-center rounded-full border bg-container shrink-0">
                              <UserRound className="size-3.5" />
                           </span>
                        </div>
                     </div>
                  ) : (
                     <div key={message.id} className="flex items-start gap-2.5">
                        <span className="mt-1 inline-flex size-6 items-center justify-center rounded-full border bg-container shrink-0">
                           <Bot className="size-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                           <AgentMessageBody
                              content={message.content}
                              streaming={message.streaming}
                           />
                        </div>
                     </div>
                  )
               )}
            </div>
         </div>
         <div className="shrink-0 border-t bg-container">
            <div className="max-w-2xl mx-auto px-6 py-4">
               <ChatComposer
                  onSend={handleSend}
                  disabled={!canSend}
                  placeholder={composerPlaceholder}
               />
               {status}
            </div>
         </div>
      </div>
   );
}
