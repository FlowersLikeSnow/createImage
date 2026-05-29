import OpenAI from 'openai';

/**
 * LLM 提示词扩写器
 * 将简短的用户描述扩写为详细的生图提示词
 */

// 获取 LLM 客户端配置
function getLLMClient() {
  return new OpenAI({
    apiKey: process.env.LLM_API_KEY,
    baseURL: process.env.LLM_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  });
}

// 获取 LLM 模型名称
function getLLMModel(): string {
  return process.env.LLM_MODEL || 'glm-5';
}

export async function expandPrompt(
  basePrompt: string,
  stylePrompt: string = '',
  options?: {
    model?: string;
    maxTokens?: number;
  }
): Promise<{
  expandedPrompt: string;
  originalPrompt: string;
}> {
  const openai = getLLMClient();
  const model = options?.model || getLLMModel();

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `你是一个专业的 AI 生图提示词扩写助手。你需要将用户的简短描述扩写为详细的生图提示词。

扩写规则：
1. 补充场景细节（背景、环境、氛围）
2. 补充光线描述（光源、光质、色温）
3. 补充人物细节（表情、姿态、服装质感）
4. 补充画质要求（高清、专业摄影、锐度）
5. 输出中文提示词，便于 AI 生图模型理解
6. 保持提示词简洁但完整，控制在 150 词以内
7. 使用专业摄影术语，提升提示词质量
8. 不要添加与用户描述冲突的内容

输出格式：直接输出扩写后的中文提示词，不要添加任何解释或额外内容。`,
        },
        {
          role: 'user',
          content: `基础描述：${basePrompt}
${stylePrompt ? `风格要求：${stylePrompt}` : ''}

请扩写为完整的生图提示词：`,
        },
      ],
      max_tokens: options?.maxTokens || 500,
      temperature: 0.7,
    });

    const expandedPrompt = response.choices[0]?.message?.content?.trim() || basePrompt;
    console.log('[LLM] expand result:', { basePrompt, stylePrompt, expandedPrompt });
    return {
      expandedPrompt,
      originalPrompt: basePrompt,
    };
  } catch (error) {
    console.error('[LLM] expand error:', error);
    // 失败时返回原始提示词
    return {
      expandedPrompt: basePrompt,
      originalPrompt: basePrompt,
    };
  }
}