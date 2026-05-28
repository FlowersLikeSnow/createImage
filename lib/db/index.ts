import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { nanoid } from 'nanoid';

// 对话表
export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  title: text('title'),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at').notNull().$defaultFn(() => Date.now()),
});

// 消息表
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user' | 'assistant'
  content: text('content'), // 用户提示词或AI回复
  referenceImage: text('reference_image'), // 用户上传的参考图路径
  generatedImages: text('generated_images'), // JSON: [{ url, id }]
  imageSize: text('image_size'), // 生图尺寸，如 '1024x1024'
  expandedPrompt: text('expanded_prompt'), // 扩写后的提示词
  status: text('status').default('pending'), // 'pending' | 'processing' | 'completed' | 'failed'
  error: text('error'),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
});

// 数据库连接
const dbPath = process.env.DATABASE_URL || './data/createimage.db';
const sqlite = new Database(dbPath);

export const db = drizzle(sqlite, { schema: { conversations, messages } });

export type Database = typeof db;

// 初始化数据库表
export function initDatabase() {
  // 创建 conversations 表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // 创建 messages 表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT,
      reference_image TEXT,
      generated_images TEXT,
      image_size TEXT,
      expanded_prompt TEXT,
      status TEXT DEFAULT 'pending',
      error TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )
  `);

  console.log('Database initialized successfully');
}

// 自动初始化
initDatabase();