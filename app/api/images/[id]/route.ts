import { NextRequest, NextResponse } from 'next/server';
import { messages } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 需要找到消息所属的 conversationId
    const allImages = messages.getAllImages();
    const msg = allImages.find(m => m.id === id);

    if (!msg) {
      return NextResponse.json({ error: '图片不存在' }, { status: 404 });
    }

    const deleted = messages.delete(id, msg.conversationId);

    if (!deleted) {
      return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { id },
    });
  } catch (error) {
    console.error('[API /images/[id]] error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '删除失败',
    }, { status: 500 });
  }
}