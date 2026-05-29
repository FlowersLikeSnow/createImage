'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, Row, Col, Statistic, Button, Spin } from 'antd';
import { GiftOutlined, UserOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { fetchWithAuth } from '@/lib/api/client';

interface Stats {
  total: number;
  unused: number;
  used: number;
  disabled: number;
}

export default function AdminHomePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">管理后台</h1>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="兑换码总数"
              value={stats?.total || 0}
              prefix={<GiftOutlined className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="未使用"
              value={stats?.unused || 0}
              prefix={<CheckCircleOutlined className="text-green-500" />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="已使用"
              value={stats?.used || 0}
              prefix={<UserOutlined className="text-orange-500" />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="已禁用"
              value={stats?.disabled || 0}
              prefix={<CloseCircleOutlined className="text-red-500" />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      <Card className="mt-6" title="快捷操作">
        <div className="flex gap-4">
          <Link href="/admin/redemption">
            <Button type="primary" icon={<GiftOutlined />}>
              兑换码管理
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}