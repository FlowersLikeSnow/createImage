'use client';

import { useState, useEffect, useCallback } from 'react';
import { db, messages, conversations } from '@/lib/db';
import type { Message, Conversation } from '@/types/conversation';
import { eq } from 'drizzle-orm';

export function useConversation() {
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // 加载所有对话
  const loadConversations = useCallback(async () => {
    try {
      const result = db.select().from(conversations).orderBy(conversations.updatedAt);
      // 需要手动转换
      const convs = result.map(conv => ({
        ...conv,
        messages: [],
      }));
      setConversations(convs as Conversation[]);
    } catch (error) {
      console.error('[useConversation] loadConversations error:', error);
    }
  }, []);

  // 加载对话消息
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const msgs = db.select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.createdAt);

      // 转换消息格式
      const formattedMsgs: Message[] = msgs.map(msg => ({
        ...msg,
        generatedImages: msg.generatedImages ? JSON.parse(msg.generatedImages) : undefined,
      }));

      return formattedMsgs;
    } catch (error) {
      console.error('[useConversation] loadMessages error:', error);
      return [];
    }
  }, []);

  // 创建新对话
  const createConversation = useCallback(async () => {
    setCurrentConversation(null);
  }, []);

  // 选择对话
  const selectConversation = useCallback(async (conversationId: string) => {
    try {
      const msgs = await loadMessages(conversationId);
      const conv = db.select().from(conversations).where(eq(conversations.id, conversationId))[0];

      if (conv) {
        setCurrentConversation({
          ...conv,
          messages: msgs,
        });
      }
    } catch (error) {
      console.error('[useConversation] selectConversation error:', error);
    }
  }, [loadMessages]);

  // 初始化加载
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    currentConversation,
    conversations,
    loadConversations,
    loadMessages,
    createConversation,
    selectConversation,
    setCurrentConversation,
  };
}