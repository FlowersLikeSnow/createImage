import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid';
import type { User, Session, UserRole } from '@/types/user';
import type { RedemptionCode, RedemptionStats } from '@/types/redemption';
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

  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_redemption_codes_code ON redemption_codes(code);
  CREATE INDEX IF NOT EXISTS idx_redemption_codes_status ON redemption_codes(status);
  CREATE INDEX IF NOT EXISTS idx_redemption_codes_batch ON redemption_codes(batch_id);
  CREATE INDEX IF NOT EXISTS idx_redemption_codes_used_by ON redemption_codes(used_by);
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
      INSERT INTO users (id, email, password_hash, nickname, credits, role, created_at)
      VALUES (?, ?, ?, ?, ?, 'user', ?)
    `);
    stmt.run(id, data.email, data.passwordHash, data.nickname, DEFAULT_CREDITS, now);
    console.log('[SQLite] Created user:', id, data.email, 'with credits:', DEFAULT_CREDITS);
    return {
      id,
      email: data.email,
      passwordHash: data.passwordHash,
      nickname: data.nickname,
      credits: DEFAULT_CREDITS,
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
      credits: row.credits ?? DEFAULT_CREDITS,
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
      credits: row.credits ?? DEFAULT_CREDITS,
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
    if (data.role !== undefined) {
      fields.push('role = ?');
      values.push(data.role);
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
  deductCredits: (id: string, imageSize: string, count: number = 1): { success: boolean; credits?: number; error?: string } => {
    const user = users.getById(id);
    if (!user) {
      return { success: false, error: '用户不存在' };
    }

    const level = getSizeLevel(imageSize);
    const deductAmount = (CREDIT_CONFIG[level as keyof typeof CREDIT_CONFIG] || CREDIT_CONFIG['1K']) * count;

    if (user.credits < deductAmount) {
      return { success: false, error: '积分不足' };
    }

    const newCredits = user.credits - deductAmount;
    users.update(id, { credits: newCredits });
    console.log('[SQLite] Deducted credits:', deductAmount, 'for user:', id, 'new credits:', newCredits);
    return { success: true, credits: newCredits };
  },

  // 获取积分扣除规则
  getCreditRules: () => CREDIT_CONFIG,
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
      updateStmt.run(userId, Date.now(), codeRow.id);

      // 增加用户积分
      const user = users.getById(userId);
      if (!user) {
        return { success: false, error: '用户不存在' };
      }
      users.update(userId, { credits: user.credits + codeRow.credits });

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

export default db;