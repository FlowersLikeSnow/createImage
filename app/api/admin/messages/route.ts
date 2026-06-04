import { NextRequest, NextResponse } from 'next/server';
import { messages, users, conversations } from '@/lib/db/sqlite';
import { verifyAuth, requireAdmin } from '@/lib/auth';
import type { MessageRole, MessageStatus } from '@/types/conversation';

// GET: 查询消息列表
export async function GET(request: NextRequest) {
  const authResult = await verifyAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
  }

  if (!requireAdmin(authResult)) {
    return NextResponse.json({ success: false, error: '需要管理员权限' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const conversationId = searchParams.get('conversationId');
  const role = searchParams.get('role') as MessageRole | null;
  const status = searchParams.get('status') as MessageStatus | null;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  // 构建查询
  let sql = 'SELECT * FROM messages';
  const conditions: string[] = [];
  const values: any[] = [];

  if (userId) {
    conditions.push('user_id = ?');
    values.push(userId);
  }
  if (conversationId) {
    conditions.push('conversation_id = ?');
    values.push(conversationId);
  }
  if (role) {
    conditions.push('role = ?');
    values.push(role);
  }
  if (status) {
    conditions.push('status = ?');
    values.push(status);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  // 统计总数
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
  const countStmt = messagesDb.prepare(countSql);
  const countResult = countStmt.get(...values) as any;
  const total = countResult?.count || 0;

  // 分页查询
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  values.push(pageSize, (page - 1) * pageSize);

  const stmt = messagesDb.prepare(sql);
  const rows = stmt.all(...values) as any[];

  // 获取用户和对话信息
  const allUsers = users.getAll();
  const userMap = new Map(allUsers.map(u => [u.id, u]));
  const allConvs = conversations.getAll();
  const convMap = new Map(allConvs.map(c => [c.id, c]));

  // 转换数据
  const msgs = rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    conversationId: row.conversation_id,
    role: row.role as MessageRole,
    content: row.content || undefined,
    referenceImage: row.reference_image || undefined,
    generatedImages: row.generated_images ? JSON.parse(row.generated_images) : undefined,
    imageSize: row.image_size || undefined,
    status: row.status as MessageStatus,
    error: row.error || undefined,
    createdAt: row.created_at,
    userNickname: userMap.get(row.user_id)?.nickname || '未知',
    userEmail: userMap.get(row.user_id)?.email || '',
    conversationTitle: convMap.get(row.conversation_id)?.title || '未知',
  }));

  // 统计信息
  const statsStmt = messagesDb.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as userMsgs,
      SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) as assistantMsgs,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM messages
  `);
  const stats = statsStmt.get() as any;

  return NextResponse.json({
    success: true,
    data: {
      messages: msgs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      stats: {
        total: stats.total || 0,
        userMsgs: stats.userMsgs || 0,
        assistantMsgs: stats.assistantMsgs || 0,
        completed: stats.completed || 0,
        processing: stats.processing || 0,
        failed: stats.failed || 0,
      },
    },
  });
}

// 需要直接访问数据库
import Database from 'better-sqlite3';
import path from 'path';
const dbPath = path.join(process.cwd(), 'data', 'users.db');
const messagesDb = new Database(dbPath);