// 对话类型定义

export type MessageRole = 'user' | 'assistant';
export type MessageStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface GeneratedImage {
  url: string;
  id: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content?: string;
  referenceImage?: string;
  generatedImages?: GeneratedImage[];
  imageSize?: string;
  expandedPrompt?: string;
  status: MessageStatus;
  error?: string;
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}