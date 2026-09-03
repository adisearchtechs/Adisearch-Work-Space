export const MAX_AGENT_INPUT_CHARS = 8000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AgentRole = 'user' | 'assistant';

export interface AgentMessageDto {
   id: string;
   role: AgentRole;
   content: string;
}

export interface AgentChatDto {
   id: string;
   title: string;
   messages: AgentMessageDto[];
}

export interface AgentPostBody {
   conversationId: string;
   input: string;
}

export function parseAgentPostBody(value: unknown): AgentPostBody | null {
   if (!value || typeof value !== 'object') return null;
   const record = value as Record<string, unknown>;
   if (typeof record.conversationId !== 'string' || !UUID.test(record.conversationId)) {
      return null;
   }
   if (typeof record.input !== 'string') return null;
   const input = record.input.trim();
   if (input.length < 1 || input.length > MAX_AGENT_INPUT_CHARS) return null;
   return { conversationId: record.conversationId, input };
}

export function agentChatTitleFrom(input: string) {
   const clean = input.trim().replace(/\s+/g, ' ');
   return clean.length > 42 ? `${clean.slice(0, 42)}…` : clean || 'New chat';
}
