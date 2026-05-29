import { nanoid } from 'nanoid';
import type { Message, Conversation } from '@/types/conversation';

// 全局单例存储（解决 Next.js 热重载数据丢失问题）
declare global {
  // eslint-disable-next-line no-var
  var conversationsStore: Map<string, Conversation> | undefined;
  // eslint-disable-next-line no-var
  var messagesStore: Map<string, Message[]> | undefined;
}

// 使用全局存储，确保热重载时数据不丢失
const conversationsStore = global.conversationsStore || new Map<string, Conversation>();
const messagesStore = global.messagesStore || new Map<string, Message[]>();

// 初始化全局存储
if (!global.conversationsStore) {
  global.conversationsStore = conversationsStore;
}
if (!global.messagesStore) {
  global.messagesStore = messagesStore;
}

// 对话表操作
export const conversations = {
  create: (data: { title: string; userId: string }): Conversation => {
    const id = nanoid();
    const now = Date.now();
    const conv: Conversation = {
      id,
      userId: data.userId,
      title: data.title,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    conversationsStore.set(id, conv);
    messagesStore.set(id, []);
    console.log('[DB] Created conversation:', id, 'for user:', data.userId);
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

  getByUserId: (userId: string): Conversation[] => {
    return Array.from(conversationsStore.values())
      .filter(c => c.userId === userId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
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
    userId: string;
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
      userId: data.userId,
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
    console.log('[DB] Created message:', id, 'for user:', data.userId, 'in conversation:', data.conversationId);
    return msg;
  },

  getByConversation: (conversationId: string): Message[] => {
    console.log('[DB] Getting messages for conversation:', conversationId, 'count:', (messagesStore.get(conversationId) || []).length);
    return messagesStore.get(conversationId) || [];
  },

  update: (id: string, conversationId: string, data: Partial<Message>): Message | null => {
    const msgs = messagesStore.get(conversationId) || [];
    const index = msgs.findIndex(m => m.id === id);
    if (index >= 0) {
      msgs[index] = { ...msgs[index], ...data };
      messagesStore.set(conversationId, msgs);
      console.log('[DB] Updated message:', id, 'status:', data.status);
      return msgs[index];
    }
    console.log('[DB] Message not found for update:', id);
    return null;
  },

  delete: (id: string, conversationId: string): boolean => {
    const msgs = messagesStore.get(conversationId) || [];
    const index = msgs.findIndex(m => m.id === id);
    if (index >= 0) {
      msgs.splice(index, 1);
      messagesStore.set(conversationId, msgs);
      console.log('[DB] Deleted message:', id);
      return true;
    }
    return false;
  },

  // 获取用户的所有图片消息（assistant 角色）
  getAllImagesByUser: (userId: string): Message[] => {
    const allImages: Message[] = [];
    messagesStore.forEach((msgs) => {
      msgs
        .filter(m => m.role === 'assistant' && m.userId === userId)
        .forEach(m => allImages.push(m));
    });
    console.log('[DB] getAllImagesByUser - userId:', userId, 'total images:', allImages.length);
    return allImages.sort((a, b) => b.createdAt - a.createdAt);
  },

  // 获取所有图片消息（旧方法，已弃用）
  getAllImages: (): Message[] => {
    const allImages: Message[] = [];
    messagesStore.forEach((msgs, convId) => {
      msgs
        .filter(m => m.role === 'assistant')
        .forEach(m => allImages.push(m));
    });
    console.log('[DB] getAllImages - conversations:', messagesStore.size, 'total images:', allImages.length);
    return allImages.sort((a, b) => b.createdAt - a.createdAt);
  },
};

// 初始化数据库
export function initDatabase() {
  console.log('[DB] Using global in-memory storage');
  console.log('[DB] Current conversations:', conversationsStore.size);
  console.log('[DB] Current messages stores:', messagesStore.size);
}