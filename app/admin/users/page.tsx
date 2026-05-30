'use client';

import { useState, useEffect } from 'react';
import { Table, Spin, Tag } from 'antd';
import { UserOutlined, CrownOutlined } from '@ant-design/icons';
import { fetchWithAuth } from '@/lib/api/client';
import type { User } from '@/types/user';

interface UserStats {
  total: number;
  totalCredits: number;
  totalConsumed: number;
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth('/api/admin/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.data.users);
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Load users error:', error);
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

  // 统计卡片
  const statCards = [
    {
      key: 'total',
      label: '用户总数',
      value: stats?.total || 0,
      icon: UserOutlined,
      accent: '#531dab',
    },
    {
      key: 'credits',
      label: '剩余积分',
      value: (stats?.totalCredits || 0).toFixed(2),
      icon: CrownOutlined,
      accent: '#22c55e',
    },
    {
      key: 'consumed',
      label: '消耗积分',
      value: (stats?.totalConsumed || 0).toFixed(2),
      icon: CrownOutlined,
      accent: '#f59e0b',
    },
  ];

  const columns = [
    {
      title: '用户',
      dataIndex: 'nickname',
      key: 'nickname',
      render: (nickname: string, record: User) => (
        <div className="flex items-center gap-[8px]">
          <div
            className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center"
            style={{
              background: record.role === 'admin' ? '#faad14' : '#531dab'
            }}
          >
            <UserOutlined className="text-white text-[14px]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[14px] text-[#333] font-medium">{nickname}</span>
            <span className="text-[12px] text-[#888]">{record.email}</span>
          </div>
        </div>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag
          color={role === 'admin' ? 'gold' : 'purple'}
          icon={role === 'admin' ? <CrownOutlined /> : <UserOutlined />}
        >
          {role === 'admin' ? '管理员' : '普通用户'}
        </Tag>
      ),
    },
    {
      title: '剩余积分',
      dataIndex: 'credits',
      key: 'credits',
      render: (credits: number) => (
        <span className="font-mono text-[14px] text-[#531dab] font-semibold">
          {credits.toFixed(2)}
        </span>
      ),
    },
    {
      title: '消耗积分',
      dataIndex: 'consumedCredits',
      key: 'consumedCredits',
      render: (consumed: number) => (
        <span className="font-mono text-[14px] text-[#f59e0b]">
          {consumed.toFixed(2)}
        </span>
      ),
    },
    {
      title: '总获得',
      dataIndex: 'totalCredits',
      key: 'totalCredits',
      render: (total: number) => (
        <span className="font-mono text-[14px] text-[#22c55e]">
          {total.toFixed(2)}
        </span>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (ts: number) => (
        <span className="text-[13px] text-[#666]">
          {new Date(ts).toLocaleString('zh-CN')}
        </span>
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      render: (ts: number) => (
        <span className="text-[13px] text-[#666]">
          {ts ? new Date(ts).toLocaleString('zh-CN') : '-'}
        </span>
      ),
    },
    {
      title: '登录IP',
      dataIndex: 'lastLoginIp',
      key: 'lastLoginIp',
      render: (ip: string) => (
        <span className="text-[13px] text-[#666] font-mono">
          {ip || '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="max-w-[1200px]">
      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-[16px] mb-[24px]">
        {statCards.map((stat) => (
          <div
            key={stat.key}
            className="bg-white rounded-[12px] p-[20px] border border-[#e8e8e8]"
          >
            <div className="flex items-center justify-between mb-[12px]">
              <span className="text-[13px] text-[#666] font-medium tracking-wide uppercase">
                {stat.label}
              </span>
              <stat.icon style={{ color: stat.accent, fontSize: '18px' }} />
            </div>
            <div className="font-mono text-[28px] font-bold text-[#333] tracking-tight">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* 用户表格 */}
      <div className="bg-white rounded-[12px] border border-[#e8e8e8] overflow-hidden">
        <Table
          dataSource={users}
          columns={columns}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 位用户`,
          }}
        />
      </div>
    </div>
  );
}