// 对话类型定义

export type MessageRole = 'user' | 'assistant';
export type MessageStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface GeneratedImage {
  url: string;
  id: string;
}

export interface Message {
  id: string;
  userId: string;           // 用户ID
  conversationId: string;
  role: MessageRole;
  content?: string;
  referenceImage?: string;
  image?: GeneratedImage;   // 单张图片
  imageSize?: string;
  expandedPrompt?: string;
  status: MessageStatus;
  error?: string;
  createdAt: number;
}

export interface Conversation {
  id: string;
  userId: string;           // 用户ID
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}