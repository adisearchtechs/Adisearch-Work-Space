import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin } from '@/lib/api/security';
import { parseAgentPostBody, type AgentChatDto, type AgentMessageDto } from '@/lib/agent/contracts';
import { authorizeAgentAccess } from '@/lib/agent/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { chatTitleFrom, getAgentReply } from '@/mock-data/agent';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function GET(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();
   const context = await authorizeAgentAccess(request, false);
   if (!context.ok) return context.response;

   const { data: conversations, error: conversationError } = await context.supabase
      .from('agent_conversations')
      .select('id, title')
      .eq('organization_id', context.organizationId)
      .eq('created_by', context.userId)
      .order('updated_at', { ascending: false })
      .limit(50);
   if (conversationError) {
      return NextResponse.json({ error: 'Unable to load Agent conversations.' }, { status: 500 });
   }

   const conversationIds = (conversations ?? []).map((conversation) => conversation.id);
   const messagesByConversation = new Map<string, AgentMessageDto[]>();
   if (conversationIds.length > 0) {
      const { data: messages, error: messageError } = await context.supabase
         .from('agent_messages')
         .select('id, conversation_id, role, content, sequence')
         .eq('organization_id', context.organizationId)
         .in('conversation_id', conversationIds)
         .order('sequence', { ascending: true });
      if (messageError) {
         return NextResponse.json({ error: 'Unable to load Agent messages.' }, { status: 500 });
      }

      for (const message of messages ?? []) {
         const list = messagesByConversation.get(message.conversation_id) ?? [];
         list.push({ id: message.id, role: message.role, content: message.content });
         messagesByConversation.set(message.conversation_id, list);
      }
   }

   const chats: AgentChatDto[] = (conversations ?? []).map((conversation) => ({
      id: conversation.id,
      title: conversation.title,
      messages: messagesByConversation.get(conversation.id) ?? [],
   }));
   return NextResponse.json(
      { chats, canWrite: context.role !== 'guest' },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}

export async function POST(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const context = await authorizeAgentAccess(request, true);
   if (!context.ok) return context.response;
   const value = await request.json().catch(() => null);
   const body = parseAgentPostBody(value);
   if (!body) {
      return NextResponse.json({ error: 'Invalid Agent message.' }, { status: 400 });
   }

   const { data: existingConversation, error: existingError } = await context.supabase
      .from('agent_conversations')
      .select('id, title')
      .eq('id', body.conversationId)
      .eq('organization_id', context.organizationId)
      .eq('created_by', context.userId)
      .maybeSingle();
   if (existingError) {
      return NextResponse.json({ error: 'Unable to load Agent conversation.' }, { status: 500 });
   }

   let conversation = existingConversation;
   let createdConversation = false;
   if (!conversation) {
      const { data, error } = await context.supabase
         .from('agent_conversations')
         .insert({
            id: body.conversationId,
            organization_id: context.organizationId,
            created_by: context.userId,
            title: chatTitleFrom(body.input),
         })
         .select('id, title')
         .single();
      if (error) {
         return NextResponse.json({ error: 'Unable to create Agent conversation.' }, { status: 500 });
      }
      conversation = data;
      createdConversation = true;
   }

   const reply = getAgentReply(body.input);
   const { data: messages, error: messageError } = await context.supabase
      .from('agent_messages')
      .insert([
         {
            organization_id: context.organizationId,
            conversation_id: conversation.id,
            role: 'user',
            content: body.input,
         },
         {
            organization_id: context.organizationId,
            conversation_id: conversation.id,
            role: 'assistant',
            content: reply,
         },
      ])
      .select('id, role, content, sequence')
      .order('sequence', { ascending: true });
   if (messageError || !messages || messages.length !== 2) {
      if (createdConversation) {
         await context.supabase
            .from('agent_conversations')
            .delete()
            .eq('id', conversation.id)
            .eq('organization_id', context.organizationId);
      }
      return NextResponse.json({ error: 'Unable to save Agent messages.' }, { status: 500 });
   }

   const { error: touchError } = await context.supabase
      .from('agent_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversation.id)
      .eq('organization_id', context.organizationId)
      .eq('created_by', context.userId);
   if (touchError) {
      return NextResponse.json({ error: 'Unable to update Agent conversation.' }, { status: 500 });
   }

   return NextResponse.json(
      {
         conversation: { id: conversation.id, title: conversation.title },
         messages: messages.map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
         } satisfies AgentMessageDto)),
      },
      { status: createdConversation ? 201 : 200 }
   );
}
