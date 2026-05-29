import { NextRequest, NextResponse } from 'next/server';
import { conversations } from '@/lib/db';
import { verifyAuth, withAuthResponse } from '@/lib/auth/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 验证登录状态
  const authResult = await verifyAuth(request);
  if (!authResult.success) {
    return withAuthResponse(authResult.error!);
  }

  try {
    const { id: conversationId } = await params;

    const result = conversations.get(conversationId);

    if (!result) {
      return NextResponse.json({ error: '对话不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[API /conversations/[id]] error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '获取对话失败',
    }, { status: 500 });
  }
}