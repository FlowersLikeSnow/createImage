// AI生图模块导出

export * from './adapter';
export * from './openai-gpt-image';

import type { ImageGenAdapter } from './adapter';
import { OpenAIGPTImageAdapter } from './openai-gpt-image';
import type { GenParams, GenResult } from '@/types/ai';

// 已注册的适配器列表
const adapters: Map<string, ImageGenAdapter> = new Map();

// 默认适配器
let defaultAdapter: ImageGenAdapter | null = null;

/**
 * 注册适配器
 */
export function registerAdapter(adapter: ImageGenAdapter, asDefault = false) {
  adapters.set(adapter.modelId, adapter);
  if (asDefault || !defaultAdapter) {
    defaultAdapter = adapter;
  }
}

/**
 * 获取适配器
 */
export function getAdapter(modelId?: string): ImageGenAdapter {
  if (modelId && adapters.has(modelId)) {
    return adapters.get(modelId)!;
  }

  if (!defaultAdapter) {
    throw new Error('No AI adapter registered. Please register at least one adapter.');
  }

  return defaultAdapter;
}

/**
 * 初始化默认适配器
 */
export function initDefaultAdapter() {
  const openaiAdapter = new OpenAIGPTImageAdapter();
  registerAdapter(openaiAdapter, true);
}

/**
 * 生成图片（便捷方法）
 */
export async function generateImage(params: GenParams, modelId?: string): Promise<GenResult> {
  const adapter = getAdapter(modelId);
  return adapter.generate(params);
}

// 自动初始化
initDefaultAdapter();