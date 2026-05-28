// AI生图参数类型
export interface GenParams {
  prompt: string;
  size?: string; // '1024x1024' | '1024x1792' | '1792x1024' 等
  n?: number;
  quality?: 'standard' | 'hd';
}

// 生图结果类型
export interface GenResult {
  images: Array<{
    url: string;
    id: string;
    b64_json?: string;
  }>;
  metadata?: {
    model?: string;
    revisedPrompt?: string;
  };
}

// 图片尺寸类型
export type ImageSize = '1024x1024' | '1024x1792' | '1792x1024' | string;