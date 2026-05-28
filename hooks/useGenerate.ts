'use client';

import { useState } from 'react';
import { message } from 'antd';
import { DEFAULT_IMAGE_SIZE } from '@/lib/utils/size-config';

interface GenerateParams {
  prompt: string;
  imageSize?: string;
  conversationId?: string;
  referenceImage?: string;
}

interface GenerateResult {
  conversationId: string;
  messageId: string;
  images: Array<{ url: string; id: string }>;
  revisedPrompt?: string;
}

export function useGenerate() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);

  const generate = async (params: GenerateParams): Promise<GenerateResult | null> => {
    setLoading(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: params.prompt,
          imageSize: params.imageSize || DEFAULT_IMAGE_SIZE,
          conversationId: params.conversationId,
          referenceImage: params.referenceImage,
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
      message.error(error instanceof Error ? error.message : '生图失败');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    result,
    generate,
  };
}