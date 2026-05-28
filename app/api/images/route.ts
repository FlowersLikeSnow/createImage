import { NextResponse } from 'next/server';
import { messages } from '@/lib/db';

export async function GET() {
  try {
    const images = messages.getAllImages();

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