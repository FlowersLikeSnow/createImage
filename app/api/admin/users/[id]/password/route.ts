import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/sqlite';
import { users } from '@/lib/db/sqlite';
import { hashPassword } from '@/lib/auth/password';
import { verifyAuth, requireAdmin } from '@/lib/auth';

// PUT: 管理员重置用户密码
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
  }

  if (!requireAdmin(authResult)) {
    return NextResponse.json({ success: false, error: '需要管理员权限' }, { status: 403 });
  }

  const { id: userId } = await params;
  const body = await request.json();
  const { password } = body;

  if (!password || password.length < 6) {
    return NextResponse.json({ success: false, error: '密码长度至少6位' });
  }

  // 检查用户是否存在
  const user = users.getById(userId);
  if (!user) {
    return NextResponse.json({ success: false, error: '用户不存在' });
  }

  // 加密新密码
  const passwordHash = await hashPassword(password);

  // 更新密码
  const stmt = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
  stmt.run(passwordHash, userId);

  console.log('[API /admin/users/[id]/password] Password reset for user:', userId);

  return NextResponse.json({
    success: true,
    data: { id: userId },
  });
}