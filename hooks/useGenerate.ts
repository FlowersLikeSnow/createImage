'use client';

import { useState } from 'react';
import { DEFAULT_IMAGE_SIZE } from '@/lib/utils/size-config';
import { fetchWithAuth } from '@/lib/api/client';

interface GenerateParams {
  prompt: string;
  imageSize?: string;
  conversationId?: string;
  referenceImage?: File; // 改为 File 类型
  numImages?: number;
}

interface GenerateResult {
  conversationId: string;
  userMessageId: string;
  images: Array<{ url: string; id: string; messageId: string; prompt: string }>;
  errors: Array<{ messageId: string; error: string }>;
  revisedPrompt?: string;
  credits?: {
    deducted: number;
    remaining: number;
  };
}

interface GenerateError {
  error: string;
  isCreditInsufficient: boolean;
}

export function useGenerate() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);

  const generate = async (params: GenerateParams): Promise<{ data?: GenerateResult; error?: GenerateError } | null> => {
    try {
      // 如果有参考图片，使用 FormData
      if (params.referenceImage) {
        const formData = new FormData();
        formData.append('prompt', params.prompt);
        formData.append('imageSize', params.imageSize || DEFAULT_IMAGE_SIZE);
        formData.append('numImages', String(params.numImages || 1));
        formData.append('referenceImage', params.referenceImage);
        if (params.conversationId) {
          formData.append('conversationId', params.conversationId);
        }

        const response = await fetchWithAuth('/api/generate', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          const errorMsg = data.error || '生图失败';
          const isCreditInsufficient = errorMsg.includes('积分不足');
          return { error: { error: errorMsg, isCreditInsufficient } };
        }

        setResult(data.data);
        return { data: data.data };
      }

      // 没有参考图片，使用 JSON
      const response = await fetchWithAuth('/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: params.prompt,
          imageSize: params.imageSize || DEFAULT_IMAGE_SIZE,
          conversationId: params.conversationId,
          numImages: params.numImages,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg = data.error || '生图失败';
        const isCreditInsufficient = errorMsg.includes('积分不足');
        return { error: { error: errorMsg, isCreditInsufficient } };
      }

      setResult(data.data);
      return { data: data.data };
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