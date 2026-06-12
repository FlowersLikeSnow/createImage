import { NextRequest, NextResponse } from 'next/server';
import { messages, conversations } from '@/lib/db';
import { deleteCloudImage } from '@/lib/utils/image-storage';
import { verifyAuth, withAuthResponse } from '@/lib/auth/middleware';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 验证登录状态
  const authResult = await verifyAuth(request);
  if (!authResult.success) {
    return withAuthResponse(authResult.error!);
  }

  try {
    const { id } = await params;

    // 通过用户的对话列表找到消息
    const userConversations = conversations.getByUserId(authResult.userId!);
    let targetMsg: any = null;
    let targetConvId: string = '';

    for (const conv of userConversations) {
      const msgs = messages.getByConversation(conv.id);
      const found = msgs.find(m => m.id === id);
      if (found) {
        targetMsg = found;
        targetConvId = conv.id;
        break;
      }
    }

    // 即使找不到消息，也返回成功（图片已经不存在了）
    if (!targetMsg) {
      return NextResponse.json({
        success: true,
        data: { id, message: '图片记录已不存在' },
      });
    }

    // 尝试删除七牛云上的图片文件（即使失败也继续删除数据库记录）
    if (targetMsg.generatedImages && targetMsg.generatedImages.length > 0) {
      const imageUrl = targetMsg.generatedImages[0].url;
      // 只有是七牛云 URL 才尝试删除
      if (imageUrl.includes('qiniu.upload.servers.lijundong.cn')) {
        try {
          await deleteCloudImage(imageUrl);
        } catch (deleteError) {
          // 文件删除失败不影响数据库记录删除
          console.warn('[API /images/[id]] Cloud file delete failed:', deleteError);
        }
      }
    }

    // 删除数据库记录
    messages.delete(id, targetConvId);

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