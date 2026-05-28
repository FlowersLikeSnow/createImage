import { NextResponse } from 'next/server';
import { conversations } from '@/lib/db';

export async function GET() {
  try {
    const result = conversations.getAll();

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