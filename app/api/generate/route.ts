import { NextRequest, NextResponse } from 'next/server';
import { generateImage, editImage } from '@/lib/ai';
import { conversations, messages } from '@/lib/db';
import { users } from '@/lib/db/sqlite';
import { DEFAULT_IMAGE_SIZE, getCreditBySize } from '@/lib/utils/size-config';
import { saveImageToCloud } from '@/lib/utils/image-storage';
import { verifyAuth, withAuthResponse } from '@/lib/auth/middleware';
import Big from 'big.js';

export async function POST(request: NextRequest) {
  // 验证登录状态
  const authResult = await verifyAuth(request);
  if (!authResult.success) {
    return withAuthResponse(authResult.error!);
  }

  try {
    // 解析请求（可能是 FormData 或 JSON）
    let prompt: string;
    let imageSize: string;
    let conversationId: string | undefined;
    let numImages: number;
    let referenceImage: File | undefined;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // FormData 格式（有参考图片）
      const formData = await request.formData();
      prompt = formData.get('prompt') as string;
      imageSize = (formData.get('imageSize') as string) || DEFAULT_IMAGE_SIZE;
      conversationId = formData.get('conversationId') as string | undefined;
      numImages = parseInt(formData.get('numImages') as string || '1', 10);
      referenceImage = formData.get('referenceImage') as File | undefined;
    } else {
      // JSON 格式（无参考图片）
      const body = await request.json();
      prompt = body.prompt;
      imageSize = body.imageSize || DEFAULT_IMAGE_SIZE;
      conversationId = body.conversationId;
      numImages = body.numImages || 1;
      referenceImage = undefined;
    }

    if (!prompt) {
      return NextResponse.json({ error: '缺少提示词' }, { status: 400 });
    }

    // 检查用户积分是否足够
    const user = users.getById(authResult.userId!);
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const creditPerImage = getCreditBySize(imageSize);
    const count = Math.min(Math.max(numImages || 1, 1), 10);
    const totalCreditsNeeded = Number(Big(creditPerImage).times(count));

    const userCredits = user.credits ?? 0;
    if (Big(userCredits).lt(totalCreditsNeeded)) {
      return NextResponse.json({
        success: false,
        error: `积分不足，需要 ${totalCreditsNeeded.toFixed(2)} 积分，当前剩余 ${userCredits.toFixed(2)} 积分`,
      }, { status: 400 });
    }

    // 先扣除积分
    const deductResult = users.deductCredits(authResult.userId!, imageSize, count);
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
    if (!convId) {
      const conv = conversations.create({ title: prompt.slice(0, 50), userId: authResult.userId! });
      convId = conv.id;
    } else {
      const conv = conversations.get(convId);
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
      referenceImage: referenceImage ? 'local_file' : undefined,
      imageSize: imageSize,
      status: 'completed',
    });

    // 创建多个AI消息（pending状态）
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

    // 并行发起多个请求
    const results = await Promise.allSettled(
      aiMsgIds.map(async (msgId) => {
        try {
          // 根据是否有参考图片调用不同的接口
          let result;
          if (referenceImage) {
            console.log('[API /generate] Using edit API with reference image');
            result = await editImage({
              prompt,
              image: referenceImage,
              size: imageSize,
              n: 1,
            });
          } else {
            result = await generateImage({
              prompt,
              size: imageSize,
              n: 1,
            });
          }

          // 获取外部图片 URL
          const externalUrl = result.images[0]?.url;
          if (!externalUrl) {
            throw new Error('未返回图片');
          }

          // 保存图片到七牛云
          const cloudUrl = await saveImageToCloud(externalUrl);
          console.log('[API /generate] Saved image to cloud:', cloudUrl);

          // 更新AI消息状态
          messages.update(msgId, convId, {
            status: 'completed',
            image: { url: cloudUrl, id: result.images[0].id },
            content: result.metadata?.revisedPrompt || prompt,
          });

          return {
            messageId: msgId,
            success: true,
            image: { url: cloudUrl, id: result.images[0].id },
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

    results.forEach((result, index) => {
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
      } else if (result.status === 'rejected') {
        // 处理 Promise reject 的情况（如网络错误、API 异常等）
        errors.push({
          messageId: aiMsgIds[index],
          error: result.reason instanceof Error ? result.reason.message : '生图失败',
        });
      }
    });

    // 失败的图片还原积分
    const failedCount = errors.length;
    const creditsRefunded = Number(Big(creditPerImage).times(failedCount));
    if (failedCount > 0) {
      const updatedUser = users.getById(authResult.userId!);
      if (updatedUser) {
        remainingCredits = Number(Big(updatedUser.credits).plus(creditsRefunded));
        users.update(authResult.userId!, { credits: remainingCredits });
        console.log('[API /generate] Refunded credits:', creditsRefunded, 'for', failedCount, 'failed images');
      }
    }

    const creditsDeducted = Number(Big(creditPerImage).times(count - failedCount));

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