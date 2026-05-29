import { NextRequest, NextResponse } from 'next/server';
import { conversations } from '@/lib/db';
import { verifyAuth, withAuthResponse } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  // 验证登录状态
  const authResult = await verifyAuth(request);
  if (!authResult.success) {
    return withAuthResponse(authResult.error!);
  }

  try {
    const result = conversations.getByUserId(authResult.userId!);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[API /conversations] error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '获取对话列表失败',
    }, { status: 500 });
  }
}