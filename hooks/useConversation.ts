'use client';

import { useState, useCallback } from 'react';
import type { Message, Conversation } from '@/types/conversation';

export function useConversation() {
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  // 加载所有对话
  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/conversations');
      const data = await response.json();
      if (data.success) {
        setConversations(data.data);
      }
    } catch (error) {
      console.error('[useConversation] loadConversations error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载对话消息
  const loadMessages = useCallback(async (conversationId: string): Promise<Message[]> => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`);
      const data = await response.json();
      if (data.success) {
        return data.data;
      }
      return [];
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
    setLoading(true);
    try {
      const msgs = await loadMessages(conversationId);
      const response = await fetch(`/api/conversations/${conversationId}`);
      const data = await response.json();
      if (data.success) {
        setCurrentConversation({
          ...data.data,
          messages: msgs,
        });
      }
    } catch (error) {
      console.error('[useConversation] selectConversation error:', error);
    } finally {
      setLoading(false);
    }
  }, [loadMessages]);

  return {
    currentConversation,
    conversations,
    loading,
    loadConversations,
    loadMessages,
    createConversation,
    selectConversation,
    setCurrentConversation,
  };
}