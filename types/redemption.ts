// 兑换码类型定义

export type RedemptionCodeStatus = 'unused' | 'used' | 'disabled';

export interface RedemptionCode {
  id: string;
  code: string;              // 兑换码
  credits: number;           // 积分面值
  status: RedemptionCodeStatus;
  batchId?: string;          // 批次ID
  createdAt: number;
  expiresAt?: number;        // 过期时间（毫秒时间戳）
  usedBy?: string;           // 使用者用户ID
  usedAt?: number;           // 使用时间
  remark?: string;           // 备注
}

// 创建兑换码请求参数
export interface CreateRedemptionCodeParams {
  code: string;
  credits: number;
  batchId?: string;
  expiresAt?: number;
  remark?: string;
}

// 批量创建兑换码请求参数
export interface CreateRedemptionBatchParams {
  count: number;             // 生成数量 (1-1000)
  credits: number;           // 每张面值
  expiresInDays?: number;    // 有效期天数
  remark?: string;           // 备注
}

// 批量创建结果
export interface CreateRedemptionBatchResult {
  batchId: string;
  count: number;
  codes: string[];           // 生成的兑换码列表
}

// 兑换码统计信息
export interface RedemptionStats {
  total: number;
  unused: number;
  used: number;
  disabled: number;
}