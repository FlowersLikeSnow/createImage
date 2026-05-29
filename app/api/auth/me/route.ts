import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/middleware';
import { users } from '@/lib/db/sqlite';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);

    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: authResult.error,
      }, { status: 401 });
    }

    const user = users.getById(authResult.userId!);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '用户不存在',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          avatar: user.avatar,
          credits: user.credits,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        },
      },
    });
  } catch (error) {
    console.error('[API /auth/me] error:', error);
    return NextResponse.json({
      success: false,
      error: '获取用户信息失败',
    }, { status: 500 });
  }
}