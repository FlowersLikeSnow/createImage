'use client';

import { useState } from 'react';
import { DEFAULT_IMAGE_SIZE } from '@/lib/utils/size-config';
import { fetchWithAuth } from '@/lib/api/client';

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
    try {
      const response = await fetchWithAuth('/api/generate', {
        method: 'POST',
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