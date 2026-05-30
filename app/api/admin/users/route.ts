import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/middleware';
import { users } from '@/lib/db/sqlite';

/**
 * 验证管理员权限
 */
function requireAdmin(userId: string): boolean {
  const user = users.getById(userId);
  return !!user && user.role === 'admin';
}

/**
 * 用户列表接口
 * GET /api/admin/users - 获取所有用户列表
 */

export async function GET(request: NextRequest) {
  const authResult = await verifyAuth(request);
  if (!authResult.success) {
    return NextResponse.json({
      success: false,
      error: '未授权',
    }, { status: 401 });
  }

  if (!requireAdmin(authResult.userId!)) {
    return NextResponse.json({
      success: false,
      error: '无权限',
    }, { status: 403 });
  }

  try {
    const userList = users.getAll();
    const stats = users.getStats();

    // 转换为前端需要的格式（去除敏感信息）
    const safeUsers = userList.map(user => ({
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatar: user.avatar,
      credits: user.credits,
      consumedCredits: user.consumedCredits,
      totalCredits: user.totalCredits,
      role: user.role,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      lastLoginIp: user.lastLoginIp,
    }));

    return NextResponse.json({
      success: true,
      data: {
        users: safeUsers,
        stats,
      },
    });
  } catch (error) {
    console.error('[API /admin/users GET] error:', error);
    return NextResponse.json({
      success: false,
      error: '查询失败',
    }, { status: 500 });
  }
}