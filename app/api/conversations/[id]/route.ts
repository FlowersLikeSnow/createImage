import { NextRequest, NextResponse } from 'next/server';
import { db, conversations } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;

    const result = db.select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .execute();

    if (result.length === 0) {
      return NextResponse.json({ error: '对话不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error('[API /conversations/[id]] error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '获取对话失败',
    }, { status: 500 });
  }
}