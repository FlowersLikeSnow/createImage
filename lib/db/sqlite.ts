import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid';
import type { User, Session } from '@/types/user';

// 数据库文件路径
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'users.db');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log('[SQLite] Created data directory:', DATA_DIR);
}

// 初始化数据库
const db = new Database(DB_PATH);

// 创建表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nickname TEXT NOT NULL,
    avatar TEXT,
    created_at INTEGER NOT NULL,
    last_login_at INTEGER,
    last_login_ip TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`);

console.log('[SQLite] Database initialized at:', DB_PATH);

// 用户操作
export const users = {
  create: (data: {
    email: string;
    passwordHash: string;
    nickname: string;
  }): User => {
    const id = nanoid();
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO users (id, email, password_hash, nickname, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, data.email, data.passwordHash, data.nickname, now);
    console.log('[SQLite] Created user:', id, data.email);
    return {
      id,
      email: data.email,
      passwordHash: data.passwordHash,
      nickname: data.nickname,
      createdAt: now,
    };
  },

  getByEmail: (email: string): User | null => {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const row = stmt.get(email) as any;
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      nickname: row.nickname,
      avatar: row.avatar,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at,
      lastLoginIp: row.last_login_ip,
    };
  },

  getById: (id: string): User | null => {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      nickname: row.nickname,
      avatar: row.avatar,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at,
      lastLoginIp: row.last_login_ip,
    };
  },

  update: (id: string, data: Partial<User>): User | null => {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.nickname !== undefined) {
      fields.push('nickname = ?');
      values.push(data.nickname);
    }
    if (data.lastLoginAt !== undefined) {
      fields.push('last_login_at = ?');
      values.push(data.lastLoginAt);
    }
    if (data.lastLoginIp !== undefined) {
      fields.push('last_login_ip = ?');
      values.push(data.lastLoginIp);
    }

    if (fields.length === 0) return users.getById(id);

    values.push(id);
    const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    console.log('[SQLite] Updated user:', id);
    return users.getById(id);
  },
};

// 会话操作
export const sessions = {
  create: (userId: string, token: string, expiresAt: number): Session => {
    const id = nanoid();
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO sessions (id, user_id, token, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, userId, token, now, expiresAt);
    console.log('[SQLite] Created session for user:', userId);
    return {
      id,
      userId,
      token,
      createdAt: now,
      expiresAt,
    };
  },

  getByToken: (token: string): Session | null => {
    const stmt = db.prepare('SELECT * FROM sessions WHERE token = ?');
    const row = stmt.get(token) as any;
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      token: row.token,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    };
  },

  deleteByToken: (token: string): boolean => {
    const stmt = db.prepare('DELETE FROM sessions WHERE token = ?');
    const result = stmt.run(token);
    console.log('[SQLite] Deleted session:', token, 'changes:', result.changes);
    return result.changes > 0;
  },

  deleteByUserId: (userId: string): boolean => {
    const stmt = db.prepare('DELETE FROM sessions WHERE user_id = ?');
    const result = stmt.run(userId);
    return result.changes > 0;
  },

  cleanExpired: (): number => {
    const now = Date.now();
    const stmt = db.prepare('DELETE FROM sessions WHERE expires_at < ?');
    const result = stmt.run(now);
    console.log('[SQLite] Cleaned expired sessions:', result.changes);
    return result.changes;
  },
};

export default db;