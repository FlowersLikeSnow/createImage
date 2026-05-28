import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '@/lib/ai';
import { conversations, messages } from '@/lib/db';
import { DEFAULT_IMAGE_SIZE } from '@/lib/utils/size-config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, imageSize, conversationId, referenceImage } = body;

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
      status: 'pending',
    });

    // 创建AI消息（pending状态）
    const aiMsg = messages.create({
      conversationId: convId,
      role: 'assistant',
      status: 'processing',
    });

    try {
      // 调用生图API
      const result = await generateImage({
        prompt,
        size: imageSize || DEFAULT_IMAGE_SIZE,
        n: 1,
      });

      // 更新AI消息状态
      messages.update(aiMsg.id, convId, {
        status: 'completed',
        generatedImages: result.images,
        content: result.metadata?.revisedPrompt || prompt,
      });

      // 更新用户消息状态
      messages.update(userMsg.id, convId, { status: 'completed' });

      return NextResponse.json({
        success: true,
        data: {
          conversationId: convId,
          messageId: aiMsg.id,
          images: result.images,
          revisedPrompt: result.metadata?.revisedPrompt,
        },
      });
    } catch (genError) {
      // 更新AI消息错误状态
      messages.update(aiMsg.id, convId, {
        status: 'failed',
        error: genError instanceof Error ? genError.message : '生图失败',
      });

      messages.update(userMsg.id, convId, { status: 'failed' });

      return NextResponse.json({
        error: genError instanceof Error ? genError.message : '生图失败',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[API /generate] error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '服务器错误',
    }, { status: 500 });
  }
}