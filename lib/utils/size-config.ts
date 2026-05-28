// 图片尺寸配置

export const IMAGE_SIZE_OPTIONS = [
  { value: '1024x1024', label: '1:1 正方形', ratio: '1:1' },
  { value: '1024x1280', label: '4:5 竖版', ratio: '4:5' },
  { value: '1280x1024', label: '5:4 横版', ratio: '5:4' },
  { value: '1024x1792', label: '9:16 竖版', ratio: '9:16' },
  { value: '1792x1024', label: '16:9 横版', ratio: '16:9' },
];

// 默认尺寸
export const DEFAULT_IMAGE_SIZE = '1024x1024';

// 验证尺寸格式是否为有效的 16px 倍数
export function isValidImageSize(size: string): boolean {
  const match = size.match(/^(\d+)x(\d+)$/);
  if (!match) return false;
  const w = parseInt(match[1]);
  const h = parseInt(match[2]);
  return w >= 16 && h >= 16 && w % 16 === 0 && h % 16 === 0;
}

// 根据比例获取尺寸
export function getSizeByRatio(ratio: string): string {
  const option = IMAGE_SIZE_OPTIONS.find(opt => opt.ratio === ratio);
  return option?.value || DEFAULT_IMAGE_SIZE;
}