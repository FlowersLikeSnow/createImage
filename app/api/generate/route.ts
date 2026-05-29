import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '@/lib/ai';
import { conversations, messages } from '@/lib/db';
import { users } from '@/lib/db/sqlite';
import { DEFAULT_IMAGE_SIZE, getSizeLevel } from '@/lib/utils/size-config';
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

    // 检查用户积分是否足够
    const user = users.getById(authResult.userId!);
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const sizeLevel = getSizeLevel(imageSize || DEFAULT_IMAGE_SIZE);
    const creditPerImage = sizeLevel === '1K' ? 0.1 : sizeLevel === '2K' ? 0.2 : 0.3;
    const count = Math.min(Math.max(numImages || 1, 1), 10);
    const totalCreditsNeeded = creditPerImage * count;

    if (user.credits < totalCreditsNeeded) {
      return NextResponse.json({
        success: false,
        error: `积分不足，需要 ${totalCreditsNeeded.toFixed(2)} 积分，当前剩余 ${user.credits.toFixed(2)} 积分`,
      }, { status: 400 });
    }

    // 先扣除积分
    const deductResult = users.deductCredits(authResult.userId!, imageSize || DEFAULT_IMAGE_SIZE, count);
    if (!deductResult.success) {
      return NextResponse.json({
        success: false,
        error: deductResult.error || '积分扣除失败',
      }, { status: 400 });
    }
    let remainingCredits = deductResult.credits!;
    console.log('[API /generate] Pre-deducted credits:', totalCreditsNeeded, 'for', count, 'images');

    // 创建或获取对话
    let convId = conversationId;
    let conv = null;
    if (!convId) {
      conv = conversations.create({ title: prompt.slice(0, 50), userId: authResult.userId! });
      convId = conv.id;
    } else {
      conv = conversations.get(convId);
      if (conv) {
        conversations.update(convId, { updatedAt: Date.now() });
      }
    }

    // 创建用户消息
    const userMsg = messages.create({
      userId: authResult.userId!,
      conversationId: convId,
      role: 'user',
      content: prompt,
      referenceImage,
      imageSize: imageSize || DEFAULT_IMAGE_SIZE,
      status: 'completed',
    });

    // 创建多个AI消息（pending状态），每个对应一张图片
    const aiMsgIds: string[] = [];
    for (let i = 0; i < count; i++) {
      const aiMsg = messages.create({
        userId: authResult.userId!,
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

    // 失败的图片还原积分
    const failedCount = errors.length;
    const creditsRefunded = failedCount * creditPerImage;
    if (failedCount > 0) {
      const updatedUser = users.getById(authResult.userId!);
      if (updatedUser) {
        remainingCredits = updatedUser.credits + creditsRefunded;
        users.update(authResult.userId!, { credits: remainingCredits });
        console.log('[API /generate] Refunded credits:', creditsRefunded, 'for', failedCount, 'failed images');
      }
    }

    const creditsDeducted = (count - failedCount) * creditPerImage;

    return NextResponse.json({
      success: true,
      data: {
        conversationId: convId,
        userMessageId: userMsg.id,
        images,
        errors,
        revisedPrompt: results[0]?.status === 'fulfilled' ? results[0].value.revisedPrompt : undefined,
        credits: {
          deducted: creditsDeducted,
          remaining: remainingCredits,
        },
      },
    });
  } catch (error) {
    console.error('[API /generate] error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '服务器错误',
    }, { status: 500 });
  }
}