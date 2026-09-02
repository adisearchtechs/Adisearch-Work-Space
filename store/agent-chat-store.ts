import { create } from 'zustand';
import { chatTitleFrom, getAgentReply } from '@/mock-data/agent';
import type { AgentChatDto, AgentMessageDto } from '@/lib/agent/contracts';

export interface AgentMessage extends AgentMessageDto {
   /** True while the assistant reply is still being "typed". */
   streaming?: boolean;
}

export interface AgentChat {
   id: string;
   title: string;
   messages: AgentMessage[];
}

type PersistenceStatus = 'idle' | 'loading' | 'ready' | 'error';

interface AgentChatState {
   chats: AgentChat[];
   activeChatId: string | null;
   persistenceOrganization: string | null;
   persistenceStatus: PersistenceStatus;
   persistenceError: string | null;
   connectPersistence: (organizationSlug: string | null) => void;
   setActiveChat: (chatId: string | null) => void;
   startNewChat: () => void;
   /** Sends locally immediately and queues configured-workspace persistence. */
   sendMessage: (input: string) => { chatId: string; assistantMessageId: string; reply: string };
   appendToMessage: (chatId: string, messageId: string, chunk: string) => void;
   finishMessage: (chatId: string, messageId: string) => void;
}

let persistenceQueue = Promise.resolve();

const asChat = (chat: AgentChatDto): AgentChat => ({
   id: chat.id,
   title: chat.title,
   messages: chat.messages,
});

export const useAgentChatStore = create<AgentChatState>((set, get) => ({
   chats: [],
   activeChatId: null,
   persistenceOrganization: null,
   persistenceStatus: 'idle',
   persistenceError: null,

   connectPersistence: (organizationSlug) => {
      const state = get();
      if (!organizationSlug) {
         if (state.persistenceOrganization !== null) {
            set({
               chats: [],
               activeChatId: null,
               persistenceOrganization: null,
               persistenceStatus: 'idle',
               persistenceError: null,
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
      });
      const endpoint = `/api/agent?organization=${encodeURIComponent(organizationSlug)}`;
      void fetch(endpoint, {
         credentials: 'same-origin',
         headers: { Accept: 'application/json' },
      })
         .then(async (response) => {
            if (!response.ok) throw new Error(String(response.status));
            return (await response.json()) as { chats: AgentChatDto[] };
         })
         .then((payload) => {
            if (get().persistenceOrganization !== organizationSlug) return;
            const remoteChats = payload.chats.map(asChat);
            set((current) => {
               const localById = new Map(current.chats.map((chat) => [chat.id, chat]));
               const mergedRemote = remoteChats.map((chat) => localById.get(chat.id) ?? chat);
               const remoteIds = new Set(remoteChats.map((chat) => chat.id));
               const localOnly = current.chats.filter((chat) => !remoteIds.has(chat.id));
               return {
                  chats: [...localOnly, ...mergedRemote],
                  persistenceStatus: 'ready',
                  persistenceError: null,
               };
            });
         })
         .catch(() => {
            if (get().persistenceOrganization !== organizationSlug) return;
            set({
               persistenceStatus: 'error',
               persistenceError: 'Conversation history could not be loaded.',
            });
         });
   },

   setActiveChat: (chatId) => set({ activeChatId: chatId }),

   startNewChat: () => set({ activeChatId: null }),

   sendMessage: (input) => {
      const state = get();
      const reply = getAgentReply(input);
      const assistantMessageId = crypto.randomUUID();
      const userMessage: AgentMessage = {
         id: crypto.randomUUID(),
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
         });
      } else {
         const chat: AgentChat = {
            id: chatId,
            title: chatTitleFrom(input),
            messages: [userMessage, assistantMessage],
         };
         set({ chats: [chat, ...state.chats], activeChatId: chat.id });
      }

      const organizationSlug = state.persistenceOrganization;
      if (organizationSlug) {
         const endpoint = `/api/agent?organization=${encodeURIComponent(organizationSlug)}`;
         persistenceQueue = persistenceQueue
            .then(async () => {
               const response = await fetch(endpoint, {
                  method: 'POST',
                  credentials: 'same-origin',
                  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                  body: JSON.stringify({ conversationId: chatId, input }),
               });
               const payload = (await response.json().catch(() => ({}))) as { error?: string };
               if (!response.ok) throw new Error(payload.error || String(response.status));
               if (get().persistenceOrganization === organizationSlug) {
                  set({ persistenceStatus: 'ready', persistenceError: null });
               }
            })
            .catch(() => {
               if (get().persistenceOrganization === organizationSlug) {
                  set({
                     persistenceStatus: 'error',
                     persistenceError: 'This conversation could not be saved.',
                  });
               }
            });
      }

      return { chatId, assistantMessageId, reply };
   },

   appendToMessage: (chatId, messageId, chunk) =>
      set((state) => ({
         chats: state.chats.map((chat) =>
            chat.id === chatId
               ? {
                    ...chat,
                    messages: chat.messages.map((message) =>
                       message.id === messageId
                          ? { ...message, content: message.content + chunk }
                          : message
                    ),
                 }
               : chat
         ),
      })),

   finishMessage: (chatId, messageId) =>
      set((state) => ({
         chats: state.chats.map((chat) =>
            chat.id === chatId
               ? {
                    ...chat,
                    messages: chat.messages.map((message) =>
                       message.id === messageId ? { ...message, streaming: false } : message
                    ),
                 }
               : chat
         ),
      })),
}));
