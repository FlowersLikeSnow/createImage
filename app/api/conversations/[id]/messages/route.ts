import { NextRequest, NextResponse } from 'next/server';
import { messages } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;

    const result = messages.getByConversation(conversationId);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[API /conversations/[id]/messages] error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '获取消息失败',
    }, { status: 500 });
  }
}