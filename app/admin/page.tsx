'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Spin } from 'antd';
import { GiftOutlined, CheckCircleOutlined, UserOutlined, StopOutlined } from '@ant-design/icons';
import { fetchWithAuth } from '@/lib/api/client';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface Stats {
  total: number;
  unused: number;
  used: number;
  disabled: number;
}

export default function AdminHomePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth('/api/admin/redemption');
      const data = await response.json();
      if (data.success) {
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Load stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Spin size="large" />
      </div>
    );
  }

  // 统计卡片数据
  const statCards = [
    {
      key: 'total',
      label: '兑换码总数',
      value: stats?.total || 0,
      icon: GiftOutlined,
      accent: '#531dab',
    },
    {
      key: 'unused',
      label: '未使用',
      value: stats?.unused || 0,
      icon: CheckCircleOutlined,
      accent: '#22c55e',
    },
    {
      key: 'used',
      label: '已使用',
      value: stats?.used || 0,
      icon: UserOutlined,
      accent: '#f59e0b',
    },
    {
      key: 'disabled',
      label: '已禁用',
      value: stats?.disabled || 0,
      icon: StopOutlined,
      accent: '#ef4444',
    },
  ];

  return (
    <div className="w-full">
      {/* 统计卡片 */}
      <div className="grid gap-[12px] md:gap-[16px] mb-[20px] md:mb-[32px]" style={{ gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
        {statCards.map((stat) => (
          <div
            key={stat.key}
            className="bg-white rounded-[12px] p-[14px] md:p-[20px] border border-[#e8e8e8]"
          >
            <div className="flex items-center justify-between mb-[12px] md:mb-[16px]">
              <span className="text-[12px] md:text-[13px] text-[#666] font-medium tracking-wide uppercase">
                {stat.label}
              </span>
              {!isMobile && <stat.icon style={{ color: stat.accent, fontSize: '18px' }} />}
            </div>
            <div className="font-mono text-[24px] md:text-[32px] font-bold text-[#333] tracking-tight">
              {stat.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* 快捷入口 */}
      <div className="bg-white rounded-[12px] border border-[#e8e8e8] p-[20px]">
        <h2 className="text-[14px] text-[#666] font-medium tracking-wide uppercase mb-[16px]">
          快捷入口
        </h2>
        <div className="flex gap-[12px]">
          <Link href="/admin/redemption">
            <Button
              type="primary"
              icon={<GiftOutlined />}
              className="h-[40px] px-[20px] rounded-[8px] font-medium"
              style={{
                background: '#531dab',
                borderColor: '#531dab',
              }}
            >
              兑换码管理
            </Button>
          </Link>
        </div>
      </div>

      {/* 使用说明 */}
      <div className="mt-[32px] bg-white rounded-[12px] border border-[#e8e8e8] p-[20px]">
        <h2 className="text-[14px] text-[#666] font-medium tracking-wide uppercase mb-[12px]">
          使用说明
        </h2>
        <div className="text-[14px] text-[#555] leading-relaxed space-y-[8px]">
          <p>• 在「兑换码」页面可批量生成兑换码，设置积分面值和有效期</p>
          <p>• 支持批量启用/禁用兑换码，选中后使用「功能」下拉菜单操作</p>
          <p>• 用户在前台点击「兑换」按钮输入兑换码获取积分</p>
          <p>• 已使用的兑换码不可更改状态</p>
        </div>
      </div>
    </div>
  );
}