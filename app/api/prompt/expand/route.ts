import { NextRequest, NextResponse } from 'next/server';
import { expandPrompt } from '@/lib/llm/prompt-expander';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, stylePrompt } = body;

    if (!prompt) {
      return NextResponse.json({ error: '缺少提示词' }, { status: 400 });
    }

    const result = await expandPrompt(prompt, stylePrompt || '');

    return NextResponse.json({
      success: true,
      data: {
        expandedPrompt: result.expandedPrompt,
        originalPrompt: result.originalPrompt,
      },
    });
  } catch (error) {
    console.error('[API /prompt/expand] error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '扩写失败',
    }, { status: 500 });
  }
}