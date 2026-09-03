import { create } from 'zustand';
import { agentChatTitleFrom, type AgentChatDto, type AgentMessageDto } from '@/lib/agent/contracts';

export interface AgentMessage extends AgentMessageDto {
   streaming?: boolean;
}

export interface AgentChat {
   id: string;
   title: string;
   messages: AgentMessage[];
}

type PersistenceStatus = 'idle' | 'loading' | 'ready' | 'error';
type AgentAvailability = { available: true; model: string } | { available: false; reason: string };

interface AgentChatState {
   chats: AgentChat[];
   activeChatId: string | null;
   persistenceOrganization: string | null;
   persistenceStatus: PersistenceStatus;
   persistenceError: string | null;
   agentAvailability: AgentAvailability | null;
   connectPersistence: (organizationSlug: string | null) => void;
   setActiveChat: (chatId: string | null) => void;
   startNewChat: () => void;
   sendMessage: (input: string) => { chatId: string; assistantMessageId: string } | null;
}

let persistenceQueue = Promise.resolve();

const asChat = (chat: AgentChatDto): AgentChat => ({
   id: chat.id,
   title: chat.title,
   messages: chat.messages,
});

function errorMessage(payload: unknown, fallback: string) {
   if (payload && typeof payload === 'object' && 'error' in payload) {
      const error = (payload as { error?: unknown }).error;
      if (typeof error === 'string' && error.trim()) return error;
   }
   return fallback;
}

export const useAgentChatStore = create<AgentChatState>((set, get) => ({
   chats: [],
   activeChatId: null,
   persistenceOrganization: null,
   persistenceStatus: 'idle',
   persistenceError: null,
   agentAvailability: null,

   connectPersistence: (organizationSlug) => {
      const state = get();
      if (!organizationSlug) {
         if (state.persistenceOrganization !== null || state.agentAvailability !== null) {
            set({
               chats: [],
               activeChatId: null,
               persistenceOrganization: null,
               persistenceStatus: 'idle',
               persistenceError: null,
               agentAvailability: {
                  available: false,
                  reason: 'Open a configured workspace to use the real Agent.',
               },
            });
         }
         return;
      }
      if (
         state.persistenceOrganization === organizationSlug &&
         state.persistenceStatus !== 'error'
      ) {
         return;
      }

      set({
         chats: [],
         activeChatId: null,
         persistenceOrganization: organizationSlug,
         persistenceStatus: 'loading',
         persistenceError: null,
         agentAvailability: null,
      });
      const endpoint = `/api/agent?organization=${encodeURIComponent(organizationSlug)}`;
      void fetch(endpoint, {
         credentials: 'same-origin',
         headers: { Accept: 'application/json' },
      })
         .then(async (response) => {
            const payload = (await response.json().catch(() => ({}))) as {
               chats?: AgentChatDto[];
               ai?: AgentAvailability;
               error?: string;
            };
            if (!response.ok) throw new Error(payload.error || String(response.status));
            return payload;
         })
         .then((payload) => {
            if (get().persistenceOrganization !== organizationSlug) return;
            const remoteChats = (payload.chats ?? []).map(asChat);
            set((current) => {
               const localById = new Map(current.chats.map((chat) => [chat.id, chat]));
               const mergedRemote = remoteChats.map((chat) => localById.get(chat.id) ?? chat);
               const remoteIds = new Set(remoteChats.map((chat) => chat.id));
               const localOnly = current.chats.filter((chat) => !remoteIds.has(chat.id));
               return {
                  chats: [...localOnly, ...mergedRemote],
                  persistenceStatus: 'ready',
                  persistenceError: null,
                  agentAvailability:
                     payload.ai ?? {
                        available: false,
                        reason: 'Agent model readiness could not be determined.',
                     },
               };
            });
         })
         .catch(() => {
            if (get().persistenceOrganization !== organizationSlug) return;
            set({
               persistenceStatus: 'error',
               persistenceError: 'Conversation history could not be loaded.',
               agentAvailability: {
                  available: false,
                  reason: 'Agent availability could not be verified.',
               },
            });
         });
   },

   setActiveChat: (chatId) => set({ activeChatId: chatId }),

   startNewChat: () => set({ activeChatId: null }),

   sendMessage: (input) => {
      const state = get();
      const organizationSlug = state.persistenceOrganization;
      if (!organizationSlug || state.agentAvailability?.available !== true) {
         set({
            persistenceError:
               state.agentAvailability?.available === false
                  ? state.agentAvailability.reason
                  : 'The Agent is not ready yet.',
         });
         return null;
      }

      const assistantMessageId = crypto.randomUUID();
      const userMessageId = crypto.randomUUID();
      const userMessage: AgentMessage = {
         id: userMessageId,
         role: 'user',
         content: input,
      };
      const assistantMessage: AgentMessage = {
         id: assistantMessageId,
         role: 'assistant',
         content: '',
         streaming: true,
      };

      const active = state.chats.find((chat) => chat.id === state.activeChatId);
      const chatId = active?.id ?? crypto.randomUUID();
      if (active) {
         set({
            chats: state.chats.map((chat) =>
               chat.id === active.id
                  ? { ...chat, messages: [...chat.messages, userMessage, assistantMessage] }
                  : chat
            ),
            persistenceError: null,
         });
      } else {
         const chat: AgentChat = {
            id: chatId,
            title: agentChatTitleFrom(input),
            messages: [userMessage, assistantMessage],
         };
         set({ chats: [chat, ...state.chats], activeChatId: chat.id, persistenceError: null });
      }

      const endpoint = `/api/agent?organization=${encodeURIComponent(organizationSlug)}`;
      persistenceQueue = persistenceQueue
         .then(async () => {
            const response = await fetch(endpoint, {
               method: 'POST',
               credentials: 'same-origin',
               headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
               body: JSON.stringify({ conversationId: chatId, input }),
            });
            const payload = (await response.json().catch(() => ({}))) as {
               conversation?: { id: string; title: string };
               messages?: AgentMessageDto[];
               error?: string;
               ai?: AgentAvailability;
            };
            if (!response.ok) throw new Error(errorMessage(payload, 'The Agent request failed.'));
            const persistedUser = payload.messages?.find((message) => message.role === 'user');
            const persistedAssistant = payload.messages?.find((message) => message.role === 'assistant');
            if (!persistedUser || !persistedAssistant) throw new Error('The Agent returned an incomplete response.');

            if (get().persistenceOrganization !== organizationSlug) return;
            set((current) => ({
               chats: current.chats.map((chat) =>
                  chat.id === chatId
                     ? {
                          ...chat,
                          title: payload.conversation?.title ?? chat.title,
                          messages: chat.messages.map((message) => {
                             if (message.id === userMessageId) return persistedUser;
                             if (message.id === assistantMessageId) {
                                return { ...persistedAssistant, streaming: false };
                             }
                             return message;
                          }),
                       }
                     : chat
               ),
               persistenceStatus: 'ready',
               persistenceError: null,
            }));
         })
         .catch((error: unknown) => {
            if (get().persistenceOrganization !== organizationSlug) return;
            const message = error instanceof Error ? error.message : 'The Agent request failed.';
            set((current) => ({
               chats: current.chats.map((chat) =>
                  chat.id === chatId
                     ? {
                          ...chat,
                          messages: chat.messages.filter(
                             (item) => item.id !== userMessageId && item.id !== assistantMessageId
                          ),
                       }
                     : chat
               ),
               persistenceStatus: 'error',
               persistenceError: message,
            }));
         });

      return { chatId, assistantMessageId };
   },
}));
