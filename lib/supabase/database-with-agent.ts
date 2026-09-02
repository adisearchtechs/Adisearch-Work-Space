import type { DatabaseWithAttachments } from '@/lib/supabase/database-with-attachments';

type AgentConversationsTable = {
   Row: {
      id: string;
      organization_id: string;
      created_by: string;
      title: string;
      created_at: string;
      updated_at: string;
   };
   Insert: {
      id?: string;
      organization_id: string;
      created_by: string;
      title: string;
      created_at?: string;
      updated_at?: string;
   };
   Update: Partial<AgentConversationsTable['Insert']>;
   Relationships: [
      {
         foreignKeyName: 'agent_conversations_organization_id_fkey';
         columns: ['organization_id'];
         isOneToOne: false;
         referencedRelation: 'organizations';
         referencedColumns: ['id'];
      },
      {
         foreignKeyName: 'agent_conversations_creator_organization_fkey';
         columns: ['created_by', 'organization_id'];
         isOneToOne: false;
         referencedRelation: 'organization_members';
         referencedColumns: ['user_id', 'organization_id'];
      },
   ];
};

type AgentMessagesTable = {
   Row: {
      id: string;
      organization_id: string;
      conversation_id: string;
      sequence: number;
      role: 'user' | 'assistant';
      content: string;
      created_at: string;
   };
   Insert: {
      id?: string;
      organization_id: string;
      conversation_id: string;
      sequence?: number;
      role: 'user' | 'assistant';
      content: string;
      created_at?: string;
   };
   Update: Partial<AgentMessagesTable['Insert']>;
   Relationships: [
      {
         foreignKeyName: 'agent_messages_organization_id_fkey';
         columns: ['organization_id'];
         isOneToOne: false;
         referencedRelation: 'organizations';
         referencedColumns: ['id'];
      },
      {
         foreignKeyName: 'agent_messages_conversation_organization_fkey';
         columns: ['conversation_id', 'organization_id'];
         isOneToOne: false;
         referencedRelation: 'agent_conversations';
         referencedColumns: ['id', 'organization_id'];
      },
   ];
};

export type DatabaseWithAgent = Omit<DatabaseWithAttachments, 'public'> & {
   public: Omit<DatabaseWithAttachments['public'], 'Tables'> & {
      Tables: DatabaseWithAttachments['public']['Tables'] & {
         agent_conversations: AgentConversationsTable;
         agent_messages: AgentMessagesTable;
      };
   };
};
