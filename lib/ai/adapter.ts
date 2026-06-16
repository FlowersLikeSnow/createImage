import type { GenParams, GenResult, EditParams } from '@/types/ai';

/**
 * 图片生成适配器接口
 * 用于抽象不同 AI 生图模型的调用方式
 */
export interface ImageGenAdapter {
  /** 适配器名称 */
  name: string;

  /** 模型标识 */
  modelId: string;

  /** 生成图片 */
  generate(params: GenParams): Promise<GenResult>;

  /** 编辑图片（图生图） */
  edit(params: EditParams): Promise<GenResult>;

  /** 检查是否可用 */
  isAvailable(): Promise<boolean>;
}

/**
 * 适配器配置
 */
export interface AdapterConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}