import { nanoid } from 'nanoid';
import type { Message, Conversation } from '@/types/conversation';

// 使用内存存储（暂不使用数据库）
const conversationsStore: Map<string, Conversation> = new Map();
const messagesStore: Map<string, Message[]> = new Map();

// 对话表操作
export const conversations = {
  create: (data: { title: string }): Conversation => {
    const id = nanoid();
    const now = Date.now();
    const conv: Conversation = {
      id,
      title: data.title,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    conversationsStore.set(id, conv);
    messagesStore.set(id, []);
    return conv;
  },

  get: (id: string): Conversation | null => {
    const conv = conversationsStore.get(id);
    if (conv) {
      return {
        ...conv,
        messages: messagesStore.get(id) || [],
      };
    }
    return null;
  },

  getAll: (): Conversation[] => {
    return Array.from(conversationsStore.values())
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  update: (id: string, data: Partial<Conversation>): Conversation | null => {
    const conv = conversationsStore.get(id);
    if (conv) {
      const updated = { ...conv, ...data, updatedAt: Date.now() };
      conversationsStore.set(id, updated);
      return updated;
    }
    return null;
  },
};

// 消息表操作
export const messages = {
  create: (data: {
    conversationId: string;
    role: 'user' | 'assistant';
    content?: string;
    referenceImage?: string;
    imageSize?: string;
    status?: 'pending' | 'processing' | 'completed' | 'failed';
  }): Message => {
    const id = nanoid();
    const msg: Message = {
      id,
      conversationId: data.conversationId,
      role: data.role,
      content: data.content || '',
      referenceImage: data.referenceImage,
      imageSize: data.imageSize,
      status: data.status || 'pending',
      createdAt: Date.now(),
    };
    const msgs = messagesStore.get(data.conversationId) || [];
    msgs.push(msg);
    messagesStore.set(data.conversationId, msgs);
    return msg;
  },

  getByConversation: (conversationId: string): Message[] => {
    return messagesStore.get(conversationId) || [];
  },

  update: (id: string, conversationId: string, data: Partial<Message>): Message | null => {
    const msgs = messagesStore.get(conversationId) || [];
    const index = msgs.findIndex(m => m.id === id);
    if (index >= 0) {
      msgs[index] = { ...msgs[index], ...data };
      messagesStore.set(conversationId, msgs);
      return msgs[index];
    }
    return null;
  },
};

// 初始化数据库（空操作）
export function initDatabase() {
  console.log('Using in-memory storage');
}