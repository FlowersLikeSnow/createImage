'use client';

import { useState } from 'react';
import { Modal, Input, Button, message, Typography, Spin } from 'antd';
import { GiftOutlined } from '@ant-design/icons';
import { fetchWithAuth } from '@/lib/api/client';

interface RedeemModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (credits: number, totalCredits: number) => void;
}

export function RedeemModal({ visible, onClose, onSuccess }: RedeemModalProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRedeem = async () => {
    if (!code.trim()) {
      message.warning('请输入兑换码');
      return;
    }

    setLoading(true);
    try {
      const response = await fetchWithAuth('/api/redemption/redeem', {
        method: 'POST',
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        message.success(data.data.message);
        onSuccess(data.data.credits, data.data.totalCredits);
        setCode('');
        onClose();
      } else {
        message.error(data.error || '兑换失败');
      }
    } catch (error) {
      console.error('Redeem error:', error);
      message.error('兑换失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 格式化兑换码输入（自动补全格式）
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 转大写，移除非字母数字字符
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // 自动格式化为 GIFT-XXXX-XXXXX-XXXX
    let formatted = '';

    if (cleaned.startsWith('GIFT')) {
      const afterGift = cleaned.slice(4);
      formatted = 'GIFT';

      // 第一段：4字符
      if (afterGift.length >= 4) {
        formatted += '-' + afterGift.slice(0, 4);
      } else if (afterGift.length > 0) {
        formatted += '-' + afterGift;
      }

      // 第二段：5字符
      if (afterGift.length > 4) {
        formatted += '-' + afterGift.slice(4, Math.min(9, afterGift.length));
      }

      // 第三段：4字符
      if (afterGift.length > 9) {
        formatted += '-' + afterGift.slice(9, Math.min(13, afterGift.length));
      }
    } else if (cleaned.length > 0) {
      // 用户没有输入 GIFT 前缀，自动添加
      formatted = 'GIFT';
      if (cleaned.length >= 4) {
        formatted += '-' + cleaned.slice(0, 4);
      } else {
        formatted += '-' + cleaned;
      }
      if (cleaned.length > 4) {
        formatted += '-' + cleaned.slice(4, Math.min(9, cleaned.length));
      }
      if (cleaned.length > 9) {
        formatted += '-' + cleaned.slice(9, Math.min(13, cleaned.length));
      }
    }

    setCode(formatted);
  };

  // 验证兑换码是否完整
  const isCodeComplete = code.length === 18; // GIFT-XXXX-XXXXX-XXXX

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <GiftOutlined className="text-purple-500" />
          <span>兑换积分</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={400}
      maskClosable={false}
    >
      <div className="py-4">
        <Typography.Paragraph className="text-gray-500 mb-4">
          请输入兑换码获取积分
        </Typography.Paragraph>

        <Input
          placeholder="GIFT-XXXX-XXXXX-XXXX"
          value={code}
          onChange={handleCodeChange}
          size="large"
          className="text-center font-mono"
          maxLength={18}
          prefix={<GiftOutlined className="text-gray-400" />}
          status={code && !isCodeComplete ? 'warning' : undefined}
        />

        {code && !isCodeComplete && (
          <Typography.Text type="warning" className="text-xs mt-1 block">
            兑换码格式不完整
          </Typography.Text>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>取消</Button>
          <Button
            type="primary"
            loading={loading}
            onClick={handleRedeem}
            disabled={!code || !isCodeComplete}
            icon={<GiftOutlined />}
          >
            兑换
          </Button>
        </div>
      </div>
    </Modal>
  );
}