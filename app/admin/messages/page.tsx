'use client';

import { useState, useEffect } from 'react';
import { Table, Spin, Tag, Input, Select, Space, Button, Image, Typography } from 'antd';
import { MessageOutlined, SearchOutlined, UserOutlined, RobotOutlined, PictureOutlined } from '@ant-design/icons';
import { fetchWithAuth } from '@/lib/api/client';
import type { Message, MessageRole, MessageStatus, GeneratedImage } from '@/types/conversation';
import dayjs from 'dayjs';

interface MessageWithUser extends Message {
  userNickname: string;
  userEmail: string;
  conversationTitle: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface Stats {
  total: number;
  userMsgs: number;
  assistantMsgs: number;
  completed: number;
  processing: number;
  failed: number;
}

export default function MessagesAdminPage() {
  const [messages, setMessages] = useState<MessageWithUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [userIdFilter, setUserIdFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState<MessageRole | ''>('');
  const [statusFilter, setStatusFilter] = useState<MessageStatus | ''>('');

  useEffect(() => {
    loadMessages(1);
  }, []);

  const loadMessages = async (page?: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (page) params.set('page', page.toString());
      if (pagination.pageSize) params.set('pageSize', pagination.pageSize.toString());
      if (userIdFilter) params.set('userId', userIdFilter);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);

      const response = await fetchWithAuth(`/api/admin/messages?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setMessages(data.data.messages);
        setStats(data.data.stats);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Load messages error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadMessages(1);
  };

  const handleClearFilter = () => {
    setUserIdFilter('');
    setRoleFilter('');
    setStatusFilter('');
    loadMessages(1);
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Spin size="large" />
      </div>
    );
  }

  // 统计卡片
  const statCards = [
    { key: 'total', label: '消息总数', value: stats?.total || 0, accent: '#531dab', icon: MessageOutlined },
    { key: 'user', label: '用户消息', value: stats?.userMsgs || 0, accent: '#3b82f6', icon: UserOutlined },
    { key: 'assistant', label: 'AI消息', value: stats?.assistantMsgs || 0, accent: '#22c55e', icon: RobotOutlined },
    { key: 'completed', label: '已完成', value: stats?.completed || 0, accent: '#10b981', icon: null },
    { key: 'failed', label: '失败', value: stats?.failed || 0, accent: '#ef4444', icon: null },
  ];

  // 角色颜色映射
  const roleColors: Record<MessageRole, string> = {
    user: 'blue',
    assistant: 'green',
  };

  // 状态颜色映射
  const statusColors: Record<MessageStatus, string> = {
    pending: 'default',
    processing: 'processing',
    completed: 'success',
    failed: 'error',
  };

  // 状态文本映射
  const statusText: Record<MessageStatus, string> = {
    pending: '等待',
    processing: '处理中',
    completed: '已完成',
    failed: '失败',
  };

  const columns = [
    {
      title: '用户',
      key: 'user',
      width: 150,
      render: (_: any, record: MessageWithUser) => (
        <div className="flex flex-col">
          <span className="text-[14px] text-[#333] font-medium">{record.userNickname}</span>
          <span className="text-[12px] text-[#888]">{record.userEmail}</span>
        </div>
      ),
    },
    {
      title: '对话',
      key: 'conversation',
      width: 120,
      render: (_: any, record: MessageWithUser) => (
        <span className="text-[13px] text-[#666]">{record.conversationTitle}</span>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 80,
      render: (role: MessageRole) => (
        <Tag color={roleColors[role]} icon={role === 'user' ? <UserOutlined /> : <RobotOutlined />}>
          {role === 'user' ? '用户' : 'AI'}
        </Tag>
      ),
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (content: string) => (
        <Typography.Text ellipsis={{ tooltip: true }} className="text-[13px] text-[#666]">
          {content || '-'}
        </Typography.Text>
      ),
    },
    {
      title: '图片',
      dataIndex: 'generatedImages',
      key: 'generatedImages',
      width: 100,
      render: (images: GeneratedImage[]) => (
        images && images.length > 0 ? (
          <Image.PreviewGroup>
            {images.map((img, idx) => (
              <Image
                key={idx}
                src={img.url}
                width={40}
                height={40}
                className="rounded-[4px] object-cover"
                placeholder={<Spin size="small" />}
              />
            ))}
          </Image.PreviewGroup>
        ) : (
          <span className="text-[#999]">-</span>
        )
      ),
    },
    {
      title: '尺寸',
      dataIndex: 'imageSize',
      key: 'imageSize',
      width: 100,
      render: (size: string) => (
        <span className="text-[13px] text-[#666] font-mono">{size || '-'}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: MessageStatus) => (
        <Tag color={statusColors[status]}>{statusText[status]}</Tag>
      ),
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (ts: number) => (
        <span className="text-[13px] text-[#666]">
          {dayjs(ts).format('YYYY-MM-DD HH:mm:ss')}
        </span>
      ),
    },
  ];

  return (
    <div className="w-full">
      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-[12px] mb-[24px]">
        {statCards.map((stat) => (
          <div
            key={stat.key}
            className="bg-white rounded-[12px] p-[16px] border border-[#e8e8e8]"
          >
            <div className="flex items-center justify-between mb-[8px]">
              <span className="text-[12px] text-[#666] font-medium">{stat.label}</span>
              {stat.icon && <stat.icon style={{ color: stat.accent, fontSize: '16px' }} />}
            </div>
            <div className="font-mono text-[24px] font-bold text-[#333]">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-[12px] p-[16px] border border-[#e8e8e8] mb-[16px]">
        <Space wrap>
          <Input
            placeholder="用户 ID"
            value={userIdFilter}
            onChange={(e) => setUserIdFilter(e.target.value)}
            style={{ width: 200 }}
            prefix={<SearchOutlined />}
          />
          <Select
            placeholder="消息角色"
            value={roleFilter}
            onChange={(val) => setRoleFilter(val)}
            style={{ width: 120 }}
            allowClear
            options={[
              { value: 'user', label: '用户' },
              { value: 'assistant', label: 'AI' },
            ]}
          />
          <Select
            placeholder="消息状态"
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            style={{ width: 120 }}
            allowClear
            options={[
              { value: 'pending', label: '等待' },
              { value: 'processing', label: '处理中' },
              { value: 'completed', label: '已完成' },
              { value: 'failed', label: '失败' },
            ]}
          />
          <Button type="primary" onClick={handleSearch} icon={<SearchOutlined />}>
            搜索
          </Button>
          <Button onClick={handleClearFilter}>
            清空筛选
          </Button>
        </Space>
      </div>

      {/* 消息表格 */}
      <div className="bg-white rounded-[12px] border border-[#e8e8e8] overflow-hidden">
        <Table
          dataSource={messages}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1000 }}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条消息`,
            onChange: (page) => loadMessages(page),
          }}
        />
      </div>
    </div>
  );
}