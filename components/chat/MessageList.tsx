'use client';

import { Spin } from 'antd';
import { MessageItem } from './MessageItem';
import type { Message } from '@/types/conversation';

interface MessageListProps {
  messages: Message[];
  onRegenerate?: () => void;
  loading?: boolean;
}

export function MessageList({ messages, onRegenerate, loading }: MessageListProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spin size="large" tip="正在生成图片..." />
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <p className="text-lg">输入提示词开始生成图片</p>
        <p className="text-sm mt-2">可以上传参考图、扩写提示词、选择尺寸</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-y-auto p-4">
      {messages.map((msg) => (
        <MessageItem
          key={msg.id}
          message={msg}
          onRegenerate={msg.role === 'assistant' ? onRegenerate : undefined}
        />
      ))}
    </div>
  );
}