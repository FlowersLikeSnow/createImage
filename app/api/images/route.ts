import { NextRequest, NextResponse } from 'next/server';
import { messages } from '@/lib/db';
import { verifyAuth, withAuthResponse } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  // 验证登录状态
  const authResult = await verifyAuth(request);
  if (!authResult.success) {
    return withAuthResponse(authResult.error!);
  }

  try {
    const images = messages.getAllImagesByUser(authResult.userId!);

    return NextResponse.json({
      success: true,
      data: images,
    });
  } catch (error) {
    console.error('[API /images] error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '获取图片失败',
    }, { status: 500 });
  }
}