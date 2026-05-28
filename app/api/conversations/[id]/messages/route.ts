import { NextRequest, NextResponse } from 'next/server';
import { db, messages } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;

    const result = db.select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt))
      .execute();

    // 转换消息格式
    const formattedMsgs = result.map(msg => ({
      ...msg,
      generatedImages: msg.generatedImages ? JSON.parse(msg.generatedImages as string) : undefined,
    }));

    return NextResponse.json({
      success: true,
      data: formattedMsgs,
    });
  } catch (error) {
    console.error('[API /conversations/[id]/messages] error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '获取消息失败',
    }, { status: 500 });
  }
}