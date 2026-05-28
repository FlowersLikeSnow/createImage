import { NextResponse } from 'next/server';
import { db, conversations } from '@/lib/db';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const result = db.select()
      .from(conversations)
      .orderBy(desc(conversations.updatedAt))
      .execute();

    return NextResponse.json({
      success: true,
      data: result.map(conv => ({
        ...conv,
        messages: [],
      })),
    });
  } catch (error) {
    console.error('[API /conversations] error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '获取对话列表失败',
    }, { status: 500 });
  }
}