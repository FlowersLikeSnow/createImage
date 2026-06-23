import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid';
import Big from 'big.js';
import type { User, Session, UserRole } from '@/types/user';
import type { RedemptionCode, RedemptionStats } from '@/types/redemption';
import type { Message, Conversation, MessageStatus, MessageRole, GeneratedImage } from '@/types/conversation';
import type { CreditRecord, CreditRecordType, CreditRecordStats } from '@/types/credit-record';
import { DEFAULT_CREDITS, CREDIT_CONFIG, getCreditByLevel, getSizeLevel } from '@/lib/utils/size-config';

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
    credits REAL DEFAULT 0.1,
    consumed_credits REAL DEFAULT 0,
    total_credits REAL DEFAULT 0.1,
    role TEXT DEFAULT 'user',
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

  CREATE TABLE IF NOT EXISTS redemption_codes (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    credits REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'unused',
    batch_id TEXT,
    created_at INTEGER NOT NULL,
    expires_at INTEGER,
    used_by TEXT,
    used_at INTEGER,
    remark TEXT,
    FOREIGN KEY (used_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT,
    reference_image TEXT,
    generated_images TEXT,
    image_size TEXT,
    expanded_prompt TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
  );

  CREATE TABLE IF NOT EXISTS credit_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    balance_after REAL NOT NULL,
    description TEXT,
    related_id TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_redemption_codes_code ON redemption_codes(code);
  CREATE INDEX IF NOT EXISTS idx_redemption_codes_status ON redemption_codes(status);
  CREATE INDEX IF NOT EXISTS idx_redemption_codes_batch ON redemption_codes(batch_id);
  CREATE INDEX IF NOT EXISTS idx_redemption_codes_used_by ON redemption_codes(used_by);
  CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
  CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
  CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
  CREATE INDEX IF NOT EXISTS idx_credit_records_user ON credit_records(user_id);
  CREATE INDEX IF NOT EXISTS idx_credit_records_type ON credit_records(type);
  CREATE INDEX IF NOT EXISTS idx_credit_records_created ON credit_records(created_at);
`);

// 添加 credits 列（如果不存在）
try {
  db.exec(`ALTER TABLE users ADD COLUMN credits REAL DEFAULT 0.1`);
} catch (e) {
  // 列已存在，忽略错误
}

// 添加 role 列（如果不存在）
try {
  db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`);
} catch (e) {
  // 列已存在，忽略错误
}

// 添加 consumed_credits 列（如果不存在）- 消耗积分累计
try {
  db.exec(`ALTER TABLE users ADD COLUMN consumed_credits REAL DEFAULT 0`);
} catch (e) {
  // 列已存在，忽略错误
}

// 添加 total_credits 列（如果不存在）- 总积分累计（包含消耗的）
try {
  db.exec(`ALTER TABLE users ADD COLUMN total_credits REAL DEFAULT 0.1`);
} catch (e) {
  // 列已存在，忽略错误
}

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
      INSERT INTO users (id, email, password_hash, nickname, credits, consumed_credits, total_credits, role, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, 'user', ?)
    `);
    stmt.run(id, data.email, data.passwordHash, data.nickname, DEFAULT_CREDITS, DEFAULT_CREDITS, now);

    // 创建注册积分记录
    const recordStmt = db.prepare(`
      INSERT INTO credit_records (id, user_id, type, amount, balance_after, description, created_at)
      VALUES (?, ?, 'register', ?, ?, ?, ?)
    `);
    recordStmt.run(nanoid(), id, DEFAULT_CREDITS, DEFAULT_CREDITS, '注册赠送初始积分', now);

    console.log('[SQLite] Created user:', id, data.email, 'with credits:', DEFAULT_CREDITS);
    return {
      id,
      email: data.email,
      passwordHash: data.passwordHash,
      nickname: data.nickname,
      credits: DEFAULT_CREDITS,
      consumedCredits: 0,
      totalCredits: DEFAULT_CREDITS,
      role: 'user' as UserRole,
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
      credits: Number(Big(row.credits ?? DEFAULT_CREDITS).round(2)), // 修正精度
      consumedCredits: Number(Big(row.consumed_credits ?? 0).round(2)), // 修正精度
      totalCredits: Number(Big(row.total_credits ?? DEFAULT_CREDITS).round(2)), // 修正精度
      role: (row.role || 'user') as UserRole,
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
      credits: Number(Big(row.credits ?? DEFAULT_CREDITS).round(2)), // 修正精度
      consumedCredits: Number(Big(row.consumed_credits ?? 0).round(2)), // 修正精度
      totalCredits: Number(Big(row.total_credits ?? DEFAULT_CREDITS).round(2)), // 修正精度
      role: (row.role || 'user') as UserRole,
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
    if (data.credits !== undefined) {
      fields.push('credits = ?');
      values.push(data.credits);
    }
    if (data.consumedCredits !== undefined) {
      fields.push('consumed_credits = ?');
      values.push(data.consumedCredits);
    }
    if (data.totalCredits !== undefined) {
      fields.push('total_credits = ?');
      values.push(data.totalCredits);
    }
    if (data.role !== undefined) {
      fields.push('role = ?');
      values.push(data.role);
    }
    if (data.avatar !== undefined) {
      fields.push('avatar = ?');
      values.push(data.avatar);
    }

    if (fields.length === 0) return users.getById(id);

    values.push(id);
    const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    console.log('[SQLite] Updated user:', id);
    return users.getById(id);
  },

  // 设置管理员角色
  setAdminRole: (id: string): boolean => {
    const stmt = db.prepare('UPDATE users SET role = ? WHERE id = ?');
    const result = stmt.run('admin', id);
    console.log('[SQLite] Set admin role for user:', id, 'changes:', result.changes);
    return result.changes > 0;
  },

  // 扣除积分（根据图片尺寸和数量）
  deductCredits: (id: string, imageSize: string, count: number = 1): { success: boolean; credits?: number; amount?: number; error?: string } => {
    const user = users.getById(id);
    if (!user) {
      return { success: false, error: '用户不存在' };
    }

    const level = getSizeLevel(imageSize);
    const deductAmount = (CREDIT_CONFIG[level as keyof typeof CREDIT_CONFIG] || CREDIT_CONFIG['1K']) * count;

    if (Big(user.credits).lt(deductAmount)) {
      return { success: false, error: '积分不足' };
    }

    const newCredits = Number(Big(user.credits).minus(deductAmount));
    const newConsumedCredits = Number(Big(user.consumedCredits).plus(deductAmount));
    users.update(id, { credits: newCredits, consumedCredits: newConsumedCredits });

    // 创建积分扣除记录
    const now = Date.now();
    const recordStmt = db.prepare(`
      INSERT INTO credit_records (id, user_id, type, amount, balance_after, description, created_at)
      VALUES (?, ?, 'generate', ?, ?, ?, ?)
    `);
    recordStmt.run(nanoid(), id, -deductAmount, newCredits, `生成图片 ${level}尺寸 ×${count}`, now);

    console.log('[SQLite] Deducted credits:', deductAmount, 'for user:', id, 'new credits:', newCredits, 'total consumed:', newConsumedCredits);
    return { success: true, credits: newCredits, amount: deductAmount };
  },

  // 退还积分（用于图片生成失败）
  refundCredits: (id: string, amount: number, reason: string = '生成失败退还'): { success: boolean; credits?: number; error?: string } => {
    const user = users.getById(id);
    if (!user) {
      return { success: false, error: '用户不存在' };
    }

    const newCredits = Number(Big(user.credits).plus(amount));
    const newConsumedCredits = Number(Big(user.consumedCredits).minus(amount));
    users.update(id, { credits: newCredits, consumedCredits: Math.max(0, newConsumedCredits) });

    // 创建积分退还记录
    const now = Date.now();
    const recordStmt = db.prepare(`
      INSERT INTO credit_records (id, user_id, type, amount, balance_after, description, created_at)
      VALUES (?, ?, 'refund', ?, ?, ?, ?)
    `);
    recordStmt.run(nanoid(), id, amount, newCredits, reason, now);

    console.log('[SQLite] Refunded credits:', amount, 'for user:', id, 'new credits:', newCredits);
    return { success: true, credits: newCredits };
  },

  // 获取积分扣除规则
  getCreditRules: () => CREDIT_CONFIG,

  // 管理员调整用户积分
  adjustCredits: (id: string, amount: number, remark: string, operatorId: string): { success: boolean; credits?: number; error?: string } => {
    const user = users.getById(id);
    if (!user) {
      return { success: false, error: '用户不存在' };
    }

    const newCredits = Number(Big(user.credits).plus(amount));
    if (newCredits < 0) {
      return { success: false, error: '调整后积分不能为负数' };
    }

    const newTotalCredits = amount > 0 ? Number(Big(user.totalCredits).plus(amount)) : user.totalCredits;
    users.update(id, { credits: newCredits, totalCredits: newTotalCredits });

    // 创建积分调整记录
    const now = Date.now();
    const type: CreditRecordType = amount > 0 ? 'admin_add' : 'admin_deduct';
    const recordStmt = db.prepare(`
      INSERT INTO credit_records (id, user_id, type, amount, balance_after, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    recordStmt.run(nanoid(), id, type, amount, newCredits, remark || `管理员调整积分`, now);

    console.log('[SQLite] Admin adjusted credits:', amount, 'for user:', id, 'by operator:', operatorId, 'new credits:', newCredits);
    return { success: true, credits: newCredits };
  },

  // 获取所有用户列表
  getAll: (): User[] => {
    const stmt = db.prepare('SELECT * FROM users ORDER BY created_at DESC');
    const rows = stmt.all() as any[];
    return rows.map(row => ({
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      nickname: row.nickname,
      avatar: row.avatar,
      credits: Number(Big(row.credits ?? DEFAULT_CREDITS).round(2)), // 修正精度
      consumedCredits: Number(Big(row.consumed_credits ?? 0).round(2)), // 修正精度
      totalCredits: Number(Big(row.total_credits ?? DEFAULT_CREDITS).round(2)), // 修正精度
      role: (row.role || 'user') as UserRole,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at,
      lastLoginIp: row.last_login_ip,
    }));
  },

  // 获取用户统计
  getStats: (): { total: number; totalCredits: number; totalConsumed: number } => {
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(credits) as totalCredits,
        SUM(consumed_credits) as totalConsumed
      FROM users
    `);
    const row = stmt.get() as any;
    return {
      total: row.total || 0,
      totalCredits: row.totalCredits || 0,
      totalConsumed: row.totalConsumed || 0,
    };
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

// 兑换码操作
export const redemptionCodes = {
  // 创建单个兑换码
  create: (data: {
    code: string;
    credits: number;
    batchId?: string;
    expiresAt?: number;
    remark?: string;
  }): RedemptionCode => {
    const id = nanoid();
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO redemption_codes (id, code, credits, status, batch_id, created_at, expires_at, remark)
      VALUES (?, ?, ?, 'unused', ?, ?, ?, ?)
    `);
    stmt.run(id, data.code, data.credits, data.batchId || null, now, data.expiresAt || null, data.remark || null);
    console.log('[SQLite] Created redemption code:', id, data.code, 'credits:', data.credits);
    return {
      id,
      code: data.code,
      credits: data.credits,
      status: 'unused',
      batchId: data.batchId,
      createdAt: now,
      expiresAt: data.expiresAt,
      remark: data.remark,
    };
  },

  // 批量创建兑换码
  createBatch: (codes: Array<{ code: string; credits: number; batchId?: string; expiresAt?: number }>): number => {
    const stmt = db.prepare(`
      INSERT INTO redemption_codes (id, code, credits, status, batch_id, created_at, expires_at)
      VALUES (?, ?, ?, 'unused', ?, ?, ?)
    `);
    const insertMany = db.transaction((items) => {
      let count = 0;
      for (const item of items) {
        try {
          stmt.run(nanoid(), item.code, item.credits, item.batchId || null, Date.now(), item.expiresAt || null);
          count++;
        } catch (e) {
          console.error('[SQLite] Failed to insert code:', item.code, e);
        }
      }
      return count;
    });
    const result = insertMany(codes);
    console.log('[SQLite] Created batch of redemption codes:', result);
    return result;
  },

  // 根据兑换码查询
  getByCode: (code: string): RedemptionCode | null => {
    const stmt = db.prepare('SELECT * FROM redemption_codes WHERE code = ?');
    const row = stmt.get(code) as any;
    if (!row) return null;
    return {
      id: row.id,
      code: row.code,
      credits: row.credits,
      status: row.status,
      batchId: row.batch_id,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      usedBy: row.used_by,
      usedAt: row.used_at,
      remark: row.remark,
    };
  },

  // 使用兑换码（事务操作）
  useCode: (code: string, userId: string): { success: boolean; credits?: number; error?: string } => {
    const useTransaction = db.transaction(() => {
      const codeRow = redemptionCodes.getByCode(code);

      if (!codeRow) {
        return { success: false, error: '兑换码不存在' };
      }

      if (codeRow.status !== 'unused') {
        return { success: false, error: '兑换码已被使用或已禁用' };
      }

      if (codeRow.expiresAt && Date.now() > codeRow.expiresAt) {
        return { success: false, error: '兑换码已过期' };
      }

      // 更新兑换码状态
      const updateStmt = db.prepare(`
        UPDATE redemption_codes
        SET status = 'used', used_by = ?, used_at = ?
        WHERE id = ?
      `);
      const now = Date.now();
      updateStmt.run(userId, now, codeRow.id);

      // 增加用户积分和总积分
      const user = users.getById(userId);
      if (!user) {
        return { success: false, error: '用户不存在' };
      }
      const newCredits = Number(Big(user.credits).plus(codeRow.credits));
      const newTotalCredits = Number(Big(user.totalCredits).plus(codeRow.credits));
      users.update(userId, {
        credits: newCredits,
        totalCredits: newTotalCredits
      });

      // 创建积分兑换记录
      const recordStmt = db.prepare(`
        INSERT INTO credit_records (id, user_id, type, amount, balance_after, description, related_id, created_at)
        VALUES (?, ?, 'redeem', ?, ?, ?, ?, ?)
      `);
      recordStmt.run(nanoid(), userId, codeRow.credits, newCredits, `兑换码 ${code}`, codeRow.id, now);

      console.log('[SQLite] Used redemption code:', code, 'by user:', userId, 'credits:', codeRow.credits);
      return { success: true, credits: codeRow.credits };
    });

    return useTransaction();
  },

  // 查询用户兑换记录
  getByUserId: (userId: string): RedemptionCode[] => {
    const stmt = db.prepare('SELECT * FROM redemption_codes WHERE used_by = ? ORDER BY used_at DESC');
    const rows = stmt.all(userId) as any[];
    return rows.map(row => ({
      id: row.id,
      code: row.code,
      credits: row.credits,
      status: row.status,
      batchId: row.batch_id,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      usedBy: row.used_by,
      usedAt: row.used_at,
      remark: row.remark,
    }));
  },

  // 查询批次下的所有兑换码
  getByBatchId: (batchId: string): RedemptionCode[] => {
    const stmt = db.prepare('SELECT * FROM redemption_codes WHERE batch_id = ? ORDER BY created_at DESC');
    const rows = stmt.all(batchId) as any[];
    return rows.map(row => ({
      id: row.id,
      code: row.code,
      credits: row.credits,
      status: row.status,
      batchId: row.batch_id,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      usedBy: row.used_by,
      usedAt: row.used_at,
      remark: row.remark,
    }));
  },

  // 查询所有兑换码（支持分页）
  getAll: (limit?: number, offset?: number): RedemptionCode[] => {
    let sql = 'SELECT * FROM redemption_codes ORDER BY created_at DESC';
    if (limit) {
      sql += ` LIMIT ${limit}`;
      if (offset) {
        sql += ` OFFSET ${offset}`;
      }
    }
    const stmt = db.prepare(sql);
    const rows = stmt.all() as any[];
    return rows.map(row => ({
      id: row.id,
      code: row.code,
      credits: row.credits,
      status: row.status,
      batchId: row.batch_id,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      usedBy: row.used_by,
      usedAt: row.used_at,
      remark: row.remark,
    }));
  },

  // 禁用/启用兑换码
  updateStatus: (id: string, status: 'unused' | 'used' | 'disabled'): boolean => {
    const stmt = db.prepare('UPDATE redemption_codes SET status = ? WHERE id = ?');
    const result = stmt.run(status, id);
    console.log('[SQLite] Updated redemption code status:', id, status, 'changes:', result.changes);
    return result.changes > 0;
  },

  // 统计信息
  getStats: (): RedemptionStats => {
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'unused' THEN 1 ELSE 0 END) as unused,
        SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) as used,
        SUM(CASE WHEN status = 'disabled' THEN 1 ELSE 0 END) as disabled
      FROM redemption_codes
    `);
    const row = stmt.get() as any;
    return {
      total: row.total || 0,
      unused: row.unused || 0,
      used: row.used || 0,
      disabled: row.disabled || 0,
    };
  },
};

// 对话操作
export const conversations = {
  create: (data: { title: string; userId: string }): Conversation => {
    const id = nanoid();
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO conversations (id, user_id, title, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, data.userId, data.title, now, now);
    console.log('[SQLite] Created conversation:', id, 'for user:', data.userId);
    return {
      id,
      userId: data.userId,
      title: data.title,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
  },

  get: (id: string): Conversation | null => {
    const stmt = db.prepare('SELECT * FROM conversations WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      messages: messages.getByConversation(row.id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  getByUserId: (userId: string): Conversation[] => {
    const stmt = db.prepare('SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC');
    const rows = stmt.all(userId) as any[];
    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      messages: [], // 不预加载消息，按需获取
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  getAll: (): Conversation[] => {
    const stmt = db.prepare('SELECT * FROM conversations ORDER BY updated_at DESC');
    const rows = stmt.all() as any[];
    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      messages: [], // 不预加载消息
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  update: (id: string, data: Partial<Conversation>): Conversation | null => {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
      fields.push('title = ?');
      values.push(data.title);
    }

    if (fields.length === 0) {
      return conversations.get(id);
    }

    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    const stmt = db.prepare(`UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    console.log('[SQLite] Updated conversation:', id);
    return conversations.get(id);
  },

  delete: (id: string): boolean => {
    // 先删除关联的消息
    const deleteMsgs = db.prepare('DELETE FROM messages WHERE conversation_id = ?');
    deleteMsgs.run(id);
    // 再删除对话
    const stmt = db.prepare('DELETE FROM conversations WHERE id = ?');
    const result = stmt.run(id);
    console.log('[SQLite] Deleted conversation:', id, 'and its messages');
    return result.changes > 0;
  },
};

// 消息操作
export const messages = {
  create: (data: {
    userId: string;
    conversationId: string;
    role: MessageRole;
    content?: string;
    referenceImage?: string;
    imageSize?: string;
    status?: MessageStatus;
  }): Message => {
    const id = nanoid();
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO messages (id, user_id, conversation_id, role, content, reference_image, image_size, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      data.userId,
      data.conversationId,
      data.role,
      data.content || null,
      data.referenceImage || null,
      data.imageSize || null,
      data.status || 'pending',
      now
    );
    // 更新对话的 updated_at
    db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(now, data.conversationId);
    console.log('[SQLite] Created message:', id, 'for user:', data.userId, 'in conversation:', data.conversationId);
    return {
      id,
      userId: data.userId,
      conversationId: data.conversationId,
      role: data.role,
      content: data.content || '',
      referenceImage: data.referenceImage,
      imageSize: data.imageSize,
      status: data.status || 'pending',
      createdAt: now,
    };
  },

  getByConversation: (conversationId: string): Message[] => {
    const stmt = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC');
    const rows = stmt.all(conversationId) as any[];
    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      conversationId: row.conversation_id,
      role: row.role as MessageRole,
      content: row.content || undefined,
      referenceImage: row.reference_image || undefined,
      image: row.generated_images ? (JSON.parse(row.generated_images) as GeneratedImage[])?.[0] : undefined,
      imageSize: row.image_size || undefined,
      expandedPrompt: row.expanded_prompt || undefined,
      status: row.status as MessageStatus,
      error: row.error || undefined,
      createdAt: row.created_at,
    }));
  },

  update: (id: string, conversationId: string, data: Partial<Message>): Message | null => {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.content !== undefined) {
      fields.push('content = ?');
      values.push(data.content);
    }
    if (data.referenceImage !== undefined) {
      fields.push('reference_image = ?');
      values.push(data.referenceImage);
    }
    if (data.image !== undefined) {
      fields.push('generated_images = ?');
      values.push(JSON.stringify(data.image ? [data.image] : []));
    }
    if (data.imageSize !== undefined) {
      fields.push('image_size = ?');
      values.push(data.imageSize);
    }
    if (data.expandedPrompt !== undefined) {
      fields.push('expanded_prompt = ?');
      values.push(data.expandedPrompt);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }
    if (data.error !== undefined) {
      fields.push('error = ?');
      values.push(data.error);
    }

    if (fields.length === 0) {
      const msgs = messages.getByConversation(conversationId);
      return msgs.find(m => m.id === id) || null;
    }

    values.push(id, conversationId);
    const stmt = db.prepare(`UPDATE messages SET ${fields.join(', ')} WHERE id = ? AND conversation_id = ?`);
    stmt.run(...values);
    console.log('[SQLite] Updated message:', id, 'status:', data.status);

    // 更新对话的 updated_at
    const now = Date.now();
    db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(now, conversationId);

    const msgs = messages.getByConversation(conversationId);
    return msgs.find(m => m.id === id) || null;
  },

  delete: (id: string, conversationId: string): boolean => {
    const stmt = db.prepare('DELETE FROM messages WHERE id = ? AND conversation_id = ?');
    const result = stmt.run(id, conversationId);
    console.log('[SQLite] Deleted message:', id);
    return result.changes > 0;
  },

  getAllImagesByUser: (userId: string): Message[] => {
    const stmt = db.prepare(`
      SELECT * FROM messages
      WHERE user_id = ? AND role = 'assistant' AND generated_images IS NOT NULL
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(userId) as any[];
    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      conversationId: row.conversation_id,
      role: row.role as MessageRole,
      content: row.content || undefined,
      referenceImage: row.reference_image || undefined,
      image: row.generated_images ? (JSON.parse(row.generated_images) as GeneratedImage[])?.[0] : undefined,
      imageSize: row.image_size || undefined,
      expandedPrompt: row.expanded_prompt || undefined,
      status: row.status as MessageStatus,
      error: row.error || undefined,
      createdAt: row.created_at,
    }));
  },

  getAllImages: (): Message[] => {
    const stmt = db.prepare(`
      SELECT * FROM messages
      WHERE role = 'assistant' AND generated_images IS NOT NULL
      ORDER BY created_at DESC
    `);
    const rows = stmt.all() as any[];
    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      conversationId: row.conversation_id,
      role: row.role as MessageRole,
      content: row.content || undefined,
      referenceImage: row.reference_image || undefined,
      image: row.generated_images ? (JSON.parse(row.generated_images) as GeneratedImage[])?.[0] : undefined,
      imageSize: row.image_size || undefined,
      expandedPrompt: row.expanded_prompt || undefined,
      status: row.status as MessageStatus,
      error: row.error || undefined,
      createdAt: row.created_at,
    }));
  },
};

// 积分消费记录操作
export const creditRecords = {
  // 创建记录
  create: (data: {
    userId: string;
    type: CreditRecordType;
    amount: number;
    balanceAfter: number;
    description?: string;
    relatedId?: string;
  }): CreditRecord => {
    const id = nanoid();
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO credit_records (id, user_id, type, amount, balance_after, description, related_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      data.userId,
      data.type,
      data.amount,
      data.balanceAfter,
      data.description || null,
      data.relatedId || null,
      now
    );
    console.log('[SQLite] Created credit record:', id, 'type:', data.type, 'amount:', data.amount, 'for user:', data.userId);
    return {
      id,
      userId: data.userId,
      type: data.type,
      amount: data.amount,
      balanceAfter: data.balanceAfter,
      description: data.description,
      relatedId: data.relatedId,
      createdAt: now,
    };
  },

  // 查询用户记录（支持分页）
  getByUserId: (userId: string, limit?: number, offset?: number): CreditRecord[] => {
    let sql = 'SELECT * FROM credit_records WHERE user_id = ? ORDER BY created_at DESC';
    if (limit) {
      sql += ` LIMIT ${limit}`;
      if (offset) {
        sql += ` OFFSET ${offset}`;
      }
    }
    const stmt = db.prepare(sql);
    const rows = stmt.all(userId) as any[];
    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      type: row.type as CreditRecordType,
      amount: row.amount,
      balanceAfter: row.balance_after,
      description: row.description || undefined,
      relatedId: row.related_id || undefined,
      createdAt: row.created_at,
    }));
  },

  // 查询所有记录（支持分页和筛选）
  getAll: (options?: {
    limit?: number;
    offset?: number;
    userId?: string;
    type?: CreditRecordType;
  }): CreditRecord[] => {
    let sql = 'SELECT * FROM credit_records';
    const conditions: string[] = [];
    const values: any[] = [];

    if (options?.userId) {
      conditions.push('user_id = ?');
      values.push(options.userId);
    }
    if (options?.type) {
      conditions.push('type = ?');
      values.push(options.type);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY created_at DESC';

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`;
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`;
      }
    }

    const stmt = db.prepare(sql);
    const rows = stmt.all(...values) as any[];
    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      type: row.type as CreditRecordType,
      amount: row.amount,
      balanceAfter: row.balance_after,
      description: row.description || undefined,
      relatedId: row.related_id || undefined,
      createdAt: row.created_at,
    }));
  },

  // 统计信息
  getStats: (userId?: string): CreditRecordStats => {
    let sql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN type = 'generate' THEN ABS(amount) ELSE 0 END) as totalGenerate,
        SUM(CASE WHEN type = 'refund' THEN ABS(amount) ELSE 0 END) as totalRefund,
        SUM(CASE WHEN type = 'redeem' THEN ABS(amount) ELSE 0 END) as totalRedeem,
        SUM(CASE WHEN type = 'admin_add' THEN ABS(amount) ELSE 0 END) as totalAdminAdd,
        SUM(CASE WHEN type = 'admin_deduct' THEN ABS(amount) ELSE 0 END) as totalAdminDeduct
      FROM credit_records
    `;
    if (userId) {
      sql += ' WHERE user_id = ?';
    }
    const stmt = db.prepare(sql);
    const row = userId ? stmt.get(userId) as any : stmt.get() as any;
    return {
      total: row.total || 0,
      totalGenerate: row.totalGenerate || 0,
      totalRefund: row.totalRefund || 0,
      totalRedeem: row.totalRedeem || 0,
      totalAdminAdd: row.totalAdminAdd || 0,
      totalAdminDeduct: row.totalAdminDeduct || 0,
    };
  },

  // 获取记录总数
  getCount: (userId?: string, type?: CreditRecordType): number => {
    let sql = 'SELECT COUNT(*) as count FROM credit_records';
    const conditions: string[] = [];
    const values: any[] = [];

    if (userId) {
      conditions.push('user_id = ?');
      values.push(userId);
    }
    if (type) {
      conditions.push('type = ?');
      values.push(type);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    const stmt = db.prepare(sql);
    const row = stmt.get(...values) as any;
    return row.count || 0;
  },
};

export default db;