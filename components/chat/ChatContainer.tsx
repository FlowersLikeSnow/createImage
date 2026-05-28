'use client';

import { useState, useCallback } from 'react';
import { message } from 'antd';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { useGenerate } from '@/hooks/useGenerate';
import { useConversation } from '@/hooks/useConversation';
import type { Message } from '@/types/conversation';

export function ChatContainer() {
  const { currentConversation, setCurrentConversation, loadMessages } = useConversation();
  const { loading, generate } = useGenerate();
  const [expandLoading, setExpandLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>(currentConversation?.messages || []);

  // 发送生图请求
  const handleSend = useCallback(async (prompt: string, imageSize: string, referenceImage?: string) => {
    // 添加用户消息到列表
    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      conversationId: currentConversation?.id || 'new',
      role: 'user',
      content: prompt,
      referenceImage,
      imageSize,
      status: 'pending',
      createdAt: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);

    // 调用生图API
    const result = await generate({
      prompt,
      imageSize,
      conversationId: currentConversation?.id,
      referenceImage,
    });

    if (result) {
      // 添加AI消息
      const aiMsg: Message = {
        id: result.messageId,
        conversationId: result.conversationId,
        role: 'assistant',
        content: result.revisedPrompt || prompt,
        generatedImages: result.images,
        status: 'completed',
        createdAt: Date.now(),
      };
      setMessages(prev => [...prev, aiMsg]);

      // 更新对话
      if (!currentConversation) {
        setCurrentConversation({
          id: result.conversationId,
          title: prompt.slice(0, 50),
          messages: [...messages, userMsg, aiMsg],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    } else {
      // 更新用户消息状态为失败
      setMessages(prev => prev.map(m =>
        m.id === userMsg.id ? { ...m, status: 'failed', error: '生图失败' } : m
      ));
    }
  }, [currentConversation, generate, setCurrentConversation, messages]);

  // 扩写提示词
  const handleExpand = useCallback(async (prompt: string): Promise<string> => {
    setExpandLoading(true);
    try {
      const response = await fetch('/api/prompt/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '扩写失败');
      }

      return data.data.expandedPrompt;
    } catch (error) {
      message.error(error instanceof Error ? error.message : '扩写失败');
      return prompt;
    } finally {
      setExpandLoading(false);
    }
  }, []);

  // 重新生成
  const handleRegenerate = useCallback(() => {
    // 找到最后一个用户消息
    const lastUserMsg = messages.filter(m => m.role === 'user').pop();
    if (lastUserMsg) {
      handleSend(lastUserMsg.content, lastUserMsg.imageSize || '1024x1024', lastUserMsg.referenceImage);
    }
  }, [messages, handleSend]);

  return (
    <div className="flex flex-col h-screen">
      {/* 标题 */}
      <div className="bg-white border-b px-4 py-3">
        <h1 className="text-xl font-semibold text-center">
          AI生图助手
        </h1>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <MessageList
          messages={messages}
          onRegenerate={handleRegenerate}
          loading={loading}
        />
      </div>

      {/* 输入区域 */}
      <InputArea
        onSend={handleSend}
        onExpand={handleExpand}
        loading={loading}
        expandLoading={expandLoading}
      />
    </div>
  );
}