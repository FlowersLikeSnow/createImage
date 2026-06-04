'use client';

import { useState, useEffect } from 'react';
import { Table, Spin, Tag, Input, Select, Space, Button } from 'antd';
import { TransactionOutlined, SearchOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { fetchWithAuth } from '@/lib/api/client';
import type { CreditRecord, CreditRecordType, CreditRecordStats } from '@/types/credit-record';
import { CREDIT_RECORD_TYPE_NAMES } from '@/types/credit-record';
import dayjs from 'dayjs';

interface RecordWithUser extends CreditRecord {
  userNickname: string;
  userEmail: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function CreditRecordsAdminPage() {
  const [records, setRecords] = useState<RecordWithUser[]>([]);
  const [stats, setStats] = useState<CreditRecordStats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [userIdFilter, setUserIdFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<CreditRecordType | ''>('');

  useEffect(() => {
    loadRecords(1);
  }, []);

  const loadRecords = async (page?: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (page) params.set('page', page.toString());
      if (pagination.pageSize) params.set('pageSize', pagination.pageSize.toString());
      if (userIdFilter) params.set('userId', userIdFilter);
      if (typeFilter) params.set('type', typeFilter);

      const response = await fetchWithAuth(`/api/admin/credit-records?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setRecords(data.data.records);
        setStats(data.data.stats);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Load records error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadRecords(1);
  };

  const handleClearFilter = () => {
    setUserIdFilter('');
    setTypeFilter('');
    loadRecords(1);
  };

  if (loading && records.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Spin size="large" />
      </div>
    );
  }

  // 统计卡片
  const statCards = [
    { key: 'total', label: '记录总数', value: stats?.total || 0, accent: '#531dab' },
    { key: 'generate', label: '生成消耗', value: (stats?.totalGenerate || 0).toFixed(2), accent: '#ef4444' },
    { key: 'redeem', label: '兑换获得', value: (stats?.totalRedeem || 0).toFixed(2), accent: '#22c55e' },
    { key: 'refund', label: '退还', value: (stats?.totalRefund || 0).toFixed(2), accent: '#f59e0b' },
    { key: 'admin', label: '管理员调整', value: ((stats?.totalAdminAdd || 0) - (stats?.totalAdminDeduct || 0)).toFixed(2), accent: '#3b82f6' },
  ];

  // 类型颜色映射
  const typeColors: Record<CreditRecordType, string> = {
    generate: 'red',
    refund: 'orange',
    redeem: 'green',
    register: 'purple',
    admin_add: 'cyan',
    admin_deduct: 'blue',
  };

  // 类型图标映射
  const typeIcons: Record<CreditRecordType, React.ReactNode> = {
    generate: <ArrowDownOutlined />,
    refund: <ArrowUpOutlined />,
    redeem: <ArrowUpOutlined />,
    register: <ArrowUpOutlined />,
    admin_add: <ArrowUpOutlined />,
    admin_deduct: <ArrowDownOutlined />,
  };

  const columns = [
    {
      title: '用户',
      key: 'user',
      render: (_: any, record: RecordWithUser) => (
        <div className="flex flex-col">
          <span className="text-[14px] text-[#333] font-medium">{record.userNickname}</span>
          <span className="text-[12px] text-[#888]">{record.userEmail}</span>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: CreditRecordType) => (
        <Tag color={typeColors[type]} icon={typeIcons[type]}>
          {CREDIT_RECORD_TYPE_NAMES[type]}
        </Tag>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <span className={`font-mono text-[14px] font-semibold ${amount > 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {amount > 0 ? '+' : ''}{amount.toFixed(2)}
        </span>
      ),
    },
    {
      title: '余额',
      dataIndex: 'balanceAfter',
      key: 'balanceAfter',
      render: (balance: number) => (
        <span className="font-mono text-[14px] text-[#531dab]">
          {balance.toFixed(2)}
        </span>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string) => (
        <span className="text-[13px] text-[#666]">{desc || '-'}</span>
      ),
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
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
              <TransactionOutlined style={{ color: stat.accent, fontSize: '16px' }} />
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
            placeholder="记录类型"
            value={typeFilter}
            onChange={(val) => setTypeFilter(val)}
            style={{ width: 150 }}
            allowClear
            options={Object.entries(CREDIT_RECORD_TYPE_NAMES).map(([key, label]) => ({
              value: key,
              label,
            }))}
          />
          <Button type="primary" onClick={handleSearch} icon={<SearchOutlined />}>
            搜索
          </Button>
          <Button onClick={handleClearFilter}>
            清空筛选
          </Button>
        </Space>
      </div>

      {/* 记录表格 */}
      <div className="bg-white rounded-[12px] border border-[#e8e8e8] overflow-hidden">
        <Table
          dataSource={records}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page) => loadRecords(page),
          }}
        />
      </div>
    </div>
  );
}