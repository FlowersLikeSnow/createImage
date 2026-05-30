// 积分消费记录类型定义

export type CreditRecordType =
  | 'generate'    // 图片生成扣除
  | 'refund'      // 生成失败退还
  | 'redeem'      // 兑换码使用
  | 'register'    // 注册初始积分
  | 'admin_add'   // 管理员手动增加
  | 'admin_deduct'; // 管理员手动扣除

export interface CreditRecord {
  id: string;
  userId: string;
  type: CreditRecordType;
  amount: number;           // 变动金额（正数为增加，负数为减少）
  balanceAfter: number;     // 操作后余额
  description?: string;     // 描述（如 "生成图片 1K尺寸"）
  relatedId?: string;       // 关联ID（消息ID/兑换码ID等）
  createdAt: number;
}

export interface CreditRecordStats {
  total: number;
  totalGenerate: number;    // 总生成扣除
  totalRefund: number;      // 总退还
  totalRedeem: number;      // 总兑换
  totalAdminAdd: number;    // 管理员增加
  totalAdminDeduct: number; // 管理员扣除
}

// 类型显示名称映射
export const CREDIT_RECORD_TYPE_NAMES: Record<CreditRecordType, string> = {
  generate: '图片生成',
  refund: '退还',
  redeem: '兑换',
  register: '注册赠送',
  admin_add: '管理员增加',
  admin_deduct: '管理员扣除',
};