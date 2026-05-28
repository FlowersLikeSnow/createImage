import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '@/lib/ai';
import { db, messages, conversations } from '@/lib/db';
import { DEFAULT_IMAGE_SIZE } from '@/lib/utils/size-config';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, imageSize, conversationId, referenceImage } = body;

    if (!prompt) {
      return NextResponse.json({ error: '缺少提示词' }, { status: 400 });
    }

    // 创建或获取对话
    let convId = conversationId;
    if (!convId) {
      const convResult = db.insert(conversations).values({
        title: prompt.slice(0, 50),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }).returning({ id: conversations.id }).execute();
      convId = convResult[0]?.id;
    } else {
      // 更新对话时间
      db.update(conversations)
        .set({ updatedAt: Date.now() })
        .where(eq(conversations.id, convId))
        .execute();
    }

    // 创建用户消息
    const userMsgResult = db.insert(messages).values({
      conversationId: convId,
      role: 'user',
      content: prompt,
      referenceImage,
      imageSize: imageSize || DEFAULT_IMAGE_SIZE,
      status: 'pending',
      createdAt: Date.now(),
    }).returning({ id: messages.id }).execute();
    const userMsgId = userMsgResult[0]?.id;

    // 创建AI消息（pending状态）
    const aiMsgResult = db.insert(messages).values({
      conversationId: convId,
      role: 'assistant',
      status: 'processing',
      createdAt: Date.now(),
    }).returning({ id: messages.id }).execute();
    const aiMsgId = aiMsgResult[0]?.id;

    try {
      // 调用生图API
      const result = await generateImage({
        prompt,
        size: imageSize || DEFAULT_IMAGE_SIZE,
        n: 1,
      });

      // 更新AI消息状态
      db.update(messages)
        .set({
          status: 'completed',
          generatedImages: JSON.stringify(result.images),
          content: result.metadata?.revisedPrompt || prompt,
        })
        .where(eq(messages.id, aiMsgId))
        .execute();

      // 更新用户消息状态
      db.update(messages)
        .set({ status: 'completed' })
        .where(eq(messages.id, userMsgId))
        .execute();

      return NextResponse.json({
        success: true,
        data: {
          conversationId: convId,
          messageId: aiMsgId,
          images: result.images,
          revisedPrompt: result.metadata?.revisedPrompt,
        },
      });
    } catch (genError) {
      // 更新AI消息错误状态
      db.update(messages)
        .set({
          status: 'failed',
          error: genError instanceof Error ? genError.message : '生图失败',
        })
        .where(eq(messages.id, aiMsgId))
        .execute();

      db.update(messages)
        .set({ status: 'failed' })
        .where(eq(messages.id, userMsgId))
        .execute();

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