import OpenAI from 'openai';
import type { ImageGenAdapter, AdapterConfig } from './adapter';
import type { GenParams, GenResult, EditParams } from '@/types/ai';
import { nanoid } from 'nanoid';

/**
 * NewAPI GPT-Image-2 适配器
 * 使用 NewAPI Images API 生成图片
 */
export class OpenAIGPTImageAdapter implements ImageGenAdapter {
  name = 'NewAPI Gemini Image';
  modelId = process.env.NEWAPI_MODEL || '';
  private client: OpenAI;
  private config: AdapterConfig;

  constructor(config?: AdapterConfig) {
    this.config = config || {};

    const apiKey = this.config.apiKey || process.env.NEWAPI_API_KEY;
    const baseUrlRaw = this.config.baseUrl || process.env.NEWAPI_BASE_URL || '';
    const baseUrl = baseUrlRaw.endsWith('/v1') ? baseUrlRaw : `${baseUrlRaw}/v1`;

    console.log('[OpenAIGPTImageAdapter] Using config:', {
      baseURL: baseUrl,
      model: this.modelId,
      hasApiKey: !!apiKey,
    });

    this.client = new OpenAI({
      apiKey,
      baseURL: baseUrl,
      timeout: this.config.timeout || 1200000, // 20分钟超时
    });
  }

  async generate(params: GenParams): Promise<GenResult> {
    console.log('[OpenAIGPTImageAdapter] generate params:', params);
    try {
      const response = await this.client.images.generate({
        model: this.modelId,
        prompt: params.prompt,
        size: params.size || '1024x1024',
        n: params.n || 1,
        response_format: 'url',
      });

      console.log('[OpenAIGPTImageAdapter] generate response:', response);
      const images = response.data || [];

      return {
        images: images.map((img) => ({
          url: img.url || '',
          id: nanoid(),
        })),
        metadata: {
          model: this.modelId,
          revisedPrompt: response.data?.[0]?.revised_prompt,
        },
      };
    } catch (error) {
      console.error('[OpenAIGPTImageAdapter] generate error:', error);
      throw error;
    }
  }

  /**
   * 编辑图片（图生图）
   * 使用 NewAPI Images Edits API
   */
  async edit(params: EditParams): Promise<GenResult> {
    console.log('[OpenAIGPTImageAdapter] edit params:', params);
    try {
      const apiKey = this.config.apiKey || process.env.NEWAPI_API_KEY; // 修复：使用正确的 API_KEY
      const baseUrlRaw = this.config.baseUrl || process.env.NEWAPI_BASE_URL || '';
      const baseUrl = baseUrlRaw.endsWith('/v1') ? baseUrlRaw : `${baseUrlRaw}/v1`;

      // 构建 FormData
      const formData = new FormData();
      formData.append('image', params.image);
      formData.append('prompt', params.prompt);
      formData.append('model', this.modelId);
      formData.append('size', params.size || '1024x1024');
      formData.append('n', String(params.n || 1));
      formData.append('response_format', 'url');

      console.log('[OpenAIGPTImageAdapter] edit request:', {
        url: `${baseUrl}/images/edits`,
        model: this.modelId,
        hasImage: !!params.image,
        imageSize: params.image.size,
      });

      const response = await fetch(`${baseUrl}/images/edits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[OpenAIGPTImageAdapter] edit API error:', response.status, errorText);
        throw new Error(`Edit API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('[OpenAIGPTImageAdapter] edit response:', result);

      const images = result.data || [];
      return {
        images: images.map((img: { url?: string }) => ({
          url: img.url || '',
          id: nanoid(),
        })),
        metadata: {
          model: this.modelId,
        },
      };
    } catch (error) {
      console.error('[OpenAIGPTImageAdapter] edit error:', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const apiKey = this.config.apiKey || process.env.NEWAPI_API_KEY;
      return !!apiKey && apiKey.length > 10;
    } catch {
      return false;
    }
  }
}