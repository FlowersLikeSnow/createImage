import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/middleware';
import { sessions } from '@/lib/db/sqlite';

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);

    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: authResult.error,
      }, { status: 401 });
    }

    // 获取 token
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.slice(7);

    if (token) {
      sessions.deleteByToken(token);
    }

    console.log('[API /auth/logout] user logged out:', authResult.userId);

    return NextResponse.json({
      success: true,
      data: { message: '已退出登录' },
    });
  } catch (error) {
    console.error('[API /auth/logout] error:', error);
    return NextResponse.json({
      success: false,
      error: '退出登录失败',
    }, { status: 500 });
  }
}