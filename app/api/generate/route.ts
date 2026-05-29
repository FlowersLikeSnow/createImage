import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '@/lib/ai';
import { conversations, messages } from '@/lib/db';
import { DEFAULT_IMAGE_SIZE } from '@/lib/utils/size-config';
import { saveImageLocally } from '@/lib/utils/image-storage';
import { verifyAuth, withAuthResponse } from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  // 验证登录状态
  const authResult = await verifyAuth(request);
  if (!authResult.success) {
    return withAuthResponse(authResult.error!);
  }

  try {
    const body = await request.json();
    const { prompt, imageSize, conversationId, referenceImage, numImages } = body;

    if (!prompt) {
      return NextResponse.json({ error: '缺少提示词' }, { status: 400 });
    }

    // 创建或获取对话
    let convId = conversationId;
    let conv = null;
    if (!convId) {
      conv = conversations.create({ title: prompt.slice(0, 50) });
      convId = conv.id;
    } else {
      conv = conversations.get(convId);
      if (conv) {
        conversations.update(convId, { updatedAt: Date.now() });
      }
    }

    // 创建用户消息
    const userMsg = messages.create({
      conversationId: convId,
      role: 'user',
      content: prompt,
      referenceImage,
      imageSize: imageSize || DEFAULT_IMAGE_SIZE,
      status: 'completed',
    });

    // 确定生成数量，默认1张，最多10张
    const count = Math.min(Math.max(numImages || 1, 1), 10);

    // 创建多个AI消息（pending状态），每个对应一张图片
    const aiMsgIds: string[] = [];
    for (let i = 0; i < count; i++) {
      const aiMsg = messages.create({
        conversationId: convId,
        role: 'assistant',
        status: 'processing',
      });
      aiMsgIds.push(aiMsg.id);
    }

    // 并行发起多个请求，每个请求 n=1
    const results = await Promise.allSettled(
      aiMsgIds.map(async (msgId) => {
        try {
          const result = await generateImage({
            prompt,
            size: imageSize || DEFAULT_IMAGE_SIZE,
            n: 1,
          });

          // 获取外部图片 URL
          const externalUrl = result.images[0]?.url;
          if (!externalUrl) {
            throw new Error('未返回图片');
          }

          // 保存图片到本地服务器
          const localUrl = await saveImageLocally(externalUrl);
          console.log('[API /generate] Saved image locally:', localUrl);

          // 更新AI消息状态（使用本地 URL）
          messages.update(msgId, convId, {
            status: 'completed',
            generatedImages: [{ url: localUrl, id: result.images[0].id }],
            content: result.metadata?.revisedPrompt || prompt,
          });

          return {
            messageId: msgId,
            success: true,
            image: { url: localUrl, id: result.images[0].id },
            revisedPrompt: result.metadata?.revisedPrompt,
          };
        } catch (error) {
          // 更新AI消息失败状态
          messages.update(msgId, convId, {
            status: 'failed',
            error: error instanceof Error ? error.message : '生图失败',
          });

          return {
            messageId: msgId,
            success: false,
            error: error instanceof Error ? error.message : '生图失败',
          };
        }
      })
    );

    // 收集成功和失败的结果
    const images: Array<{ url: string; id: string; messageId: string; prompt: string }> = [];
    const errors: Array<{ messageId: string; error: string }> = [];

    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.success && result.value.image) {
        images.push({
          url: result.value.image.url,
          id: result.value.image.id,
          messageId: result.value.messageId,
          prompt: result.value.revisedPrompt || prompt,
        });
      } else if (result.status === 'fulfilled' && !result.value.success) {
        errors.push({
          messageId: result.value.messageId,
          error: result.value.error!,
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        conversationId: convId,
        userMessageId: userMsg.id,
        images,
        errors,
        revisedPrompt: results[0]?.status === 'fulfilled' ? results[0].value.revisedPrompt : undefined,
      },
    });
  } catch (error) {
    console.error('[API /generate] error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '服务器错误',
    }, { status: 500 });
  }
}