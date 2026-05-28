'use client';

import { useState } from 'react';
import { DEFAULT_IMAGE_SIZE } from '@/lib/utils/size-config';

interface GenerateParams {
  prompt: string;
  imageSize?: string;
  conversationId?: string;
  referenceImage?: string;
  numImages?: number;
}

interface GenerateResult {
  conversationId: string;
  userMessageId: string;
  images: Array<{ url: string; id: string; messageId: string; prompt: string }>;
  errors: Array<{ messageId: string; error: string }>;
  revisedPrompt?: string;
}

export function useGenerate() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);

  const generate = async (params: GenerateParams): Promise<GenerateResult | null> => {
    // 发送请求时不设置 loading，让调用方自行处理
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: params.prompt,
          imageSize: params.imageSize || DEFAULT_IMAGE_SIZE,
          conversationId: params.conversationId,
          referenceImage: params.referenceImage,
          numImages: params.numImages,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '生图失败');
      }

      setResult(data.data);
      return data.data;
    } catch (error) {
      console.error('[useGenerate] error:', error);
      return null;
    }
  };

  // 仅用于发送按钮的短暂 loading
  const startSending = () => setLoading(true);
  const stopSending = () => setLoading(false);

  return {
    loading,
    result,
    generate,
    startSending,
    stopSending,
  };
}