import crypto from 'crypto';

// 字符集：排除易混淆字符 I, O, 0, 1
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * 生成单组随机字符（4位大写字母数字）
 */
function generateCodeSegment(): string {
  const bytes = crypto.randomBytes(4);
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += CHARSET[bytes[i] % CHARSET.length];
  }
  return result;
}

/**
 * 计算校验位
 */
function calculateChecksum(segments: string[]): string {
  const data = segments.join('');
  const hash = crypto.createHash('sha256').update(data).digest();
  return CHARSET[hash[0] % CHARSET.length];
}

/**
 * 生成完整兑换码
 * 格式: GIFT-XXXX-XXXXX-XXXX (共 18 字符)
 * 示例: GIFT-A7X2-K9M3P-5H8R
 */
export function generateRedemptionCode(): string {
  const segments = [
    generateCodeSegment(),
    generateCodeSegment(),
    generateCodeSegment(),
  ];
  const checksum = calculateChecksum(segments);
  // 将校验位插入第二段末尾，形成 5 字符的第二段
  return `GIFT-${segments[0]}-${segments[1]}${checksum}-${segments[2]}`;
}

/**
 * 验证兑换码格式
 */
export function validateCodeFormat(code: string): boolean {
  // 格式: GIFT-XXXX-XXXXX-XXXX
  const pattern = /^GIFT-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{4}$/;
  if (!pattern.test(code)) return false;

  // 验证校验位
  const parts = code.split('-');
  const segments = [parts[1], parts[2].slice(0, 4), parts[3]];
  const expectedChecksum = calculateChecksum(segments);
  const actualChecksum = parts[2].slice(4);
  return expectedChecksum === actualChecksum;
}

/**
 * 批量生成兑换码
 * @param count 生成数量
 * @param credits 积分面值
 * @returns 生成的兑换码列表
 */
export function generateBatchCodes(
  count: number,
  credits: number
): Array<{ code: string; credits: number }> {
  const codes = new Set<string>();
  const batch: Array<{ code: string; credits: number }> = [];

  // 防止无限循环，设置最大尝试次数
  const maxAttempts = count * 10;
  let attempts = 0;

  while (codes.size < count && attempts < maxAttempts) {
    const code = generateRedemptionCode();
    if (!codes.has(code)) {
      codes.add(code);
      batch.push({ code, credits });
    }
    attempts++;
  }

  if (codes.size < count) {
    console.warn('[RedemptionCode] Failed to generate all codes, requested:', count, 'generated:', codes.size);
  }

  return batch;
}

/**
 * 格式化用户输入的兑换码
 * 自动补全格式 GIFT-XXXX-XXXXX-XXXX
 */
export function formatUserCodeInput(input: string): string {
  // 转大写，移除所有非字母数字字符
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // 如果以 GIFT 开头
  if (cleaned.startsWith('GIFT')) {
    const afterGift = cleaned.slice(4);
    let formatted = 'GIFT';

    // 第一段：4字符
    if (afterGift.length >= 4) {
      formatted += '-' + afterGift.slice(0, 4);
    } else if (afterGift.length > 0) {
      formatted += '-' + afterGift;
    }

    // 第二段：5字符（包含校验位）
    if (afterGift.length > 4) {
      const segment2 = afterGift.slice(4, 9);
      if (segment2.length > 0) {
        formatted += '-' + segment2;
      }
    }

    // 第三段：4字符
    if (afterGift.length > 9) {
      const segment3 = afterGift.slice(9, 13);
      if (segment3.length > 0) {
        formatted += '-' + segment3;
      }
    }

    return formatted;
  }

  // 不以 GIFT 开头，直接添加 GIFT 前缀
  let formatted = 'GIFT';
  if (cleaned.length >= 4) {
    formatted += '-' + cleaned.slice(0, 4);
  } else if (cleaned.length > 0) {
    formatted += '-' + cleaned;
  }
  if (cleaned.length > 4) {
    formatted += '-' + cleaned.slice(4, 9);
  }
  if (cleaned.length > 9) {
    formatted += '-' + cleaned.slice(9, 13);
  }

  return formatted;
}