'use client';

import { Tag, Image } from 'antd';
import { ImagePreview } from './ImagePreview';
import type { Message } from '@/types/conversation';

interface MessageItemProps {
  message: Message;
  onRegenerate?: () => void;
}

export function MessageItem({ message, onRegenerate }: MessageItemProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[70%] ${isUser ? 'bg-blue-100' : 'bg-gray-100'} rounded-lg p-4`}>
        {/* 状态标签 */}
        {message.status !== 'completed' && (
          <Tag color={
            message.status === 'pending' ? 'default' :
            message.status === 'processing' ? 'blue' :
            'red'
          }>
            {message.status === 'pending' ? '等待中' :
             message.status === 'processing' ? '生成中' :
             '失败'}
          </Tag>
        )}

        {/* 用户消息 */}
        {isUser && (
          <div>
            <p className="text-gray-800">{message.content}</p>
            {message.referenceImage && (
              <Image src={message.referenceImage} width={100} className="mt-2 rounded" />
            )}
            {message.imageSize && (
              <Tag className="mt-1">{message.imageSize}</Tag>
            )}
          </div>
        )}

        {/* AI消息 */}
        {!isUser && (
          <div>
            {message.generatedImages && message.generatedImages.length > 0 ? (
              <ImagePreview
                images={message.generatedImages}
                onRegenerate={onRegenerate}
              />
            ) : (
              <p className="text-gray-600">
                {message.status === 'failed' ? message.error || '生成失败' : '正在生成...'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}