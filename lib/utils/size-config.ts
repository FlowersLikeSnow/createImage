// 图片尺寸配置

// 积分配置：根据图片尺寸等级
export const CREDIT_CONFIG = {
  '1K': 0.15,
  '2K': 0.25,
  '4K': 0.35,
};

// 默认积分（注册时赠送，等于1K的积分）
export const DEFAULT_CREDITS = CREDIT_CONFIG['1K'];

// 获取尺寸等级对应的积分
export function getCreditByLevel(level: '1K' | '2K' | '4K'): number {
  return CREDIT_CONFIG[level] || CREDIT_CONFIG['1K'];
}

// 获取尺寸对应的积分
export function getCreditBySize(size: string): number {
  const level = getSizeLevel(size);
  return getCreditByLevel(level);
}

// 1K 尺寸 (基于 1024x1024)
export const IMAGE_SIZE_1K = [
  { value: '1024x1024', label: '1:1', ratio: '1:1' },
  { value: '848x1264', label: '2:3', ratio: '2:3' },
  { value: '1264x848', label: '3:2', ratio: '3:2' },
  { value: '896x1200', label: '3:4', ratio: '3:4' },
  { value: '1200x896', label: '4:3', ratio: '4:3' },
  { value: '928x1152', label: '4:5', ratio: '4:5' },
  { value: '1152x928', label: '5:4', ratio: '5:4' },
  { value: '768x1376', label: '9:16', ratio: '9:16' },
  { value: '1376x768', label: '16:9', ratio: '16:9' },
  { value: '1584x672', label: '21:9', ratio: '21:9' },
];

// 2K 尺寸 (基于 2048x2048)
export const IMAGE_SIZE_2K = [
  { value: '2048x2048', label: '1:1', ratio: '1:1' },
  { value: '2048x1152', label: '16:9', ratio: '16:9' },
  { value: '1152x2048', label: '9:16', ratio: '9:16' },
  { value: '2064x1376', label: '3:2', ratio: '3:2' },
  { value: '1376x2064', label: '2:3', ratio: '2:3' },
  { value: '2048x1536', label: '4:3', ratio: '4:3' },
  { value: '1536x2048', label: '3:4', ratio: '3:4' },
  { value: '2016x864', label: '7:3', ratio: '7:3' },
  { value: '864x2016', label: '3:7', ratio: '3:7' },
  { value: '2080x1664', label: '5:4', ratio: '5:4' },
  { value: '1664x2080', label: '4:5', ratio: '4:5' },
  { value: '2048x1024', label: '2:1', ratio: '2:1' },
  { value: '2064x688', label: '3:1', ratio: '3:1' },
];

// 4K 尺寸 (基于 2880x2880 / 3840x2160)
export const IMAGE_SIZE_4K = [
  { value: '2880x2880', label: '1:1', ratio: '1:1' },
  { value: '3840x2160', label: '16:9', ratio: '16:9' },
  { value: '2160x3840', label: '9:16', ratio: '9:16' },
  { value: '3520x2352', label: '3:2', ratio: '3:2' },
  { value: '2352x3520', label: '2:3', ratio: '2:3' },
  { value: '3312x2480', label: '4:3', ratio: '4:3' },
  { value: '2480x3312', label: '3:4', ratio: '3:4' },
  { value: '3840x1648', label: '7:3', ratio: '7:3' },
  { value: '1648x3840', label: '3:7', ratio: '3:7' },
  { value: '3216x2576', label: '5:4', ratio: '5:4' },
  { value: '2576x3216', label: '4:5', ratio: '4:5' },
  { value: '3840x1920', label: '2:1', ratio: '2:1' },
  { value: '3840x1280', label: '3:1', ratio: '3:1' },
];

// 所有尺寸选项
export const IMAGE_SIZE_OPTIONS = [
  ...IMAGE_SIZE_1K.map(item => ({ ...item, level: '1K' })),
  ...IMAGE_SIZE_2K.map(item => ({ ...item, level: '2K' })),
  ...IMAGE_SIZE_4K.map(item => ({ ...item, level: '4K' })),
];

// 默认尺寸
export const DEFAULT_IMAGE_SIZE = '1024x1024';

// 根据分辨率等级获取尺寸列表
export function getSizesByLevel(level: '1K' | '2K' | '4K'): Array<{ value: string; label: string; ratio: string }> {
  switch (level) {
    case '1K':
      return IMAGE_SIZE_1K;
    case '2K':
      return IMAGE_SIZE_2K;
    case '4K':
      return IMAGE_SIZE_4K;
    default:
      return IMAGE_SIZE_1K;
  }
}

// 获取尺寸等级
export function getSizeLevel(size: string): '1K' | '2K' | '4K' {
  const option = IMAGE_SIZE_OPTIONS.find(opt => opt.value === size);
  return option?.level as '1K' | '2K' | '4K' || '1K';
}