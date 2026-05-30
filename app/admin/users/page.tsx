'use client';

import { useState, useEffect } from 'react';
import { Table, Spin, Tag, Button, Modal, Form, InputNumber, Input, message, Space } from 'antd';
import { UserOutlined, CrownOutlined, EditOutlined } from '@ant-design/icons';
import { fetchWithAuth } from '@/lib/api/client';
import type { User } from '@/types/user';
import dayjs from 'dayjs';

interface UserStats {
  total: number;
  totalCredits: number;
  totalConsumed: number;
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm] = Form.useForm();

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

  const handleEditCredits = (user: User) => {
    setEditingUser(user);
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (values: { amount: number; remark: string }) => {
    if (!editingUser) return;

    try {
      const response = await fetchWithAuth(`/api/admin/users/${editingUser.id}/credits`, {
        method: 'PUT',
        body: JSON.stringify(values),
      });
      const data = await response.json();

      if (data.success) {
        message.success(`积分调整成功，新余额: ${data.data.credits.toFixed(2)}`);
        setEditModalOpen(false);
        editForm.resetFields();
        loadUsers();
      } else {
        message.error(data.error || '调整失败');
      }
    } catch (error) {
      message.error('网络错误');
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
          {dayjs(ts).format('YYYY-MM-DD HH:mm:ss')}
        </span>
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      render: (ts: number) => (
        <span className="text-[13px] text-[#666]">
          {ts ? dayjs(ts).format('YYYY-MM-DD HH:mm:ss') : '-'}
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
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: User) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => handleEditCredits(record)}
        >
          编辑积分
        </Button>
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

      {/* 编辑积分弹窗 */}
      <Modal
        title={`编辑积分 - ${editingUser?.nickname}`}
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          editForm.resetFields();
        }}
        onOk={() => editForm.submit()}
        okText="确认"
        cancelText="取消"
      >
        <div className="mb-[16px] text-[#666]">
          当前余额：<span className="text-[#531dab] font-mono font-semibold">{editingUser?.credits.toFixed(2)}</span>
        </div>
        <Form
          form={editForm}
          onFinish={handleEditSubmit}
          layout="vertical"
        >
          <Form.Item
            name="amount"
            label="调整金额"
            rules={[{ required: true, message: '请输入调整金额' }]}
            extra="正数为增加积分，负数为扣除积分"
          >
            <InputNumber
              style={{ width: '100%' }}
              precision={2}
              placeholder="输入金额（如 0.5 或 -0.5）"
            />
          </Form.Item>
          <Form.Item
            name="remark"
            label="备注"
          >
            <Input.TextArea
              rows={2}
              placeholder="请输入调整原因（可选）"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}