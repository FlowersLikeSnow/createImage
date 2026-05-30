'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  InputNumber,
  Input,
  message,
  Space,
  Tag,
  Typography,
  Spin,
  Select,
  Dropdown,
  Card,
} from 'antd';
import { PlusOutlined, CopyOutlined, ReloadOutlined, StopOutlined, CheckOutlined, DownOutlined, SettingOutlined } from '@ant-design/icons';
import { fetchWithAuth } from '@/lib/api/client';
import type { RedemptionCode } from '@/types/redemption';

const { Text } = Typography;

export default function RedemptionAdminPage() {
  const [codes, setCodes] = useState<RedemptionCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [generateModalVisible, setGenerateModalVisible] = useState(false);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [form] = Form.useForm();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  const loadCodes = async () => {
    setLoading(true);
    try {
      const url = statusFilter
        ? `/api/admin/redemption?status=${statusFilter}`
        : '/api/admin/redemption';
      const response = await fetchWithAuth(url);
      const data = await response.json();
      if (data.success) {
        setCodes(data.data.codes);
        setSelectedRowKeys([]);
      } else {
        message.error(data.error || '加载失败');
      }
    } catch (error) {
      console.error('Load codes error:', error);
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCodes();
  }, [statusFilter]);

  const handleGenerate = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetchWithAuth('/api/admin/redemption', {
        method: 'POST',
        body: JSON.stringify({
          count: values.count,
          credits: values.credits,
          expiresInDays: values.expiresInDays,
          remark: values.remark,
        }),
      });

      const data = await response.json();
      if (data.success) {
        message.success(`成功生成 ${data.data.count} 个兑换码`);
        setGeneratedCodes(data.data.codes);
        setGenerateModalVisible(false);
        setResultModalVisible(true);
        form.resetFields();
        loadCodes();
      } else {
        message.error(data.error || '生成失败');
      }
    } catch (error) {
      console.error('Generate error:', error);
      message.error('生成失败');
    } finally {
      setLoading(false);
    }
  };

  const copyAllCodes = () => {
    const text = generatedCodes.join('\n');
    navigator.clipboard.writeText(text);
    message.success('已复制所有兑换码');
  };

  const copySingleCode = (code: string) => {
    navigator.clipboard.writeText(code);
    message.success('已复制兑换码');
  };

  // 批量更新状态
  const handleBatchUpdateStatus = async (status: 'unused' | 'disabled') => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择兑换码');
      return;
    }

    const selectedCodes = codes.filter(c => selectedRowKeys.includes(c.id));
    const usedCodes = selectedCodes.filter(c => c.status === 'used');
    if (usedCodes.length > 0) {
      message.error('已使用的兑换码不能更改状态');
      return;
    }

    setLoading(true);
    try {
      const promises = selectedRowKeys.map(id =>
        fetchWithAuth('/api/admin/redemption', {
          method: 'PUT',
          body: JSON.stringify({ id, status }),
        })
      );

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.ok).length;

      if (successCount === selectedRowKeys.length) {
        message.success(`成功更新 ${successCount} 个兑换码状态`);
        loadCodes();
      } else {
        message.warning(`更新完成，成功 ${successCount} 个，失败 ${selectedRowKeys.length - successCount} 个`);
        loadCodes();
      }
    } catch (error) {
      console.error('Batch update error:', error);
      message.error('批量更新失败');
    } finally {
      setLoading(false);
    }
  };

  // 批量操作下拉菜单
  const batchActionMenu = {
    items: [
      {
        key: 'enable',
        icon: <CheckOutlined />,
        label: '批量启用',
        onClick: () => {
          if (selectedRowKeys.length === 0) {
            message.warning('请先选择兑换码');
            return;
          }
          handleBatchUpdateStatus('unused');
        },
      },
      {
        key: 'disable',
        icon: <StopOutlined />,
        label: '批量禁用',
        onClick: () => {
          if (selectedRowKeys.length === 0) {
            message.warning('请先选择兑换码');
            return;
          }
          handleBatchUpdateStatus('disabled');
        },
      },
    ],
  };

  // 表格多选配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys as string[]);
    },
    getCheckboxProps: (record: RedemptionCode) => ({
      disabled: record.status === 'used',
    }),
  };

  // 状态样式配置
  const statusConfig = {
    unused: { bg: '#1a2e1a', text: '#22c55e', label: '未使用' },
    used: { bg: '#1a1a1e', text: '#888', label: '已使用' },
    disabled: { bg: '#2e1a1a', text: '#ef4444', label: '已禁用' },
  };

  const columns = [
    {
      title: '兑换码',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => (
        <Text
          copyable={{ text: code }}
          className="font-mono text-[13px] text-[#e0e0e0]"
        >
          {code}
        </Text>
      ),
    },
    {
      title: '积分',
      dataIndex: 'credits',
      key: 'credits',
      render: (credits: number) => (
        <span className="font-mono text-[14px] text-[#531dab] font-semibold">
          {credits}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.used;
        return (
          <span
            className="inline-flex items-center px-[8px] py-[4px] rounded-[4px] text-[12px] font-medium"
            style={{
              background: config.bg,
              color: config.text,
            }}
          >
            {config.label}
          </span>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (ts: number) => (
        <span className="text-[13px] text-[#888]">
          {new Date(ts).toLocaleString('zh-CN')}
        </span>
      ),
    },
    {
      title: '过期时间',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      render: (ts: number) => (
        <span className="text-[13px] text-[#888]">
          {ts ? new Date(ts).toLocaleString('zh-CN') : '永久'}
        </span>
      ),
    },
    {
      title: '使用者',
      dataIndex: 'usedBy',
      key: 'usedBy',
      render: (usedBy: string) => (
        <span className="text-[13px] text-[#888] font-mono">
          {usedBy || '-'}
        </span>
      ),
    },
    {
      title: '使用时间',
      dataIndex: 'usedAt',
      key: 'usedAt',
      render: (ts: number) => (
        <span className="text-[13px] text-[#888]">
          {ts ? new Date(ts).toLocaleString('zh-CN') : '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="max-w-[1200px]">
      {/* 操作栏 */}
      <div className="flex items-center justify-between mb-[20px]">
        <div className="flex items-center gap-[12px]">
          <Select
            placeholder="状态筛选"
            allowClear
            style={{ width: 140 }}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value || '')}
            className="dark-select"
            options={[
              { value: 'unused', label: '未使用' },
              { value: 'used', label: '已使用' },
              { value: 'disabled', label: '已禁用' },
            ]}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={loadCodes}
            className="h-[36px] rounded-[8px]"
          >
            刷新
          </Button>
        </div>
        <div className="flex items-center gap-[12px]">
          <Dropdown menu={batchActionMenu} placement="bottomRight">
            <Button
              icon={<SettingOutlined />}
              className="h-[36px] rounded-[8px] bg-[#1a1a1e] border-[#2a2a2e] text-[#888]"
            >
              功能 <DownOutlined />
            </Button>
          </Dropdown>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setGenerateModalVisible(true)}
            className="h-[36px] px-[16px] rounded-[8px] font-medium"
            style={{ background: '#531dab', borderColor: '#531dab' }}
          >
            生成兑换码
          </Button>
        </div>
      </div>

      {/* 选中提示 */}
      {selectedRowKeys.length > 0 && (
        <div className="mb-[16px] p-[12px] bg-[#1a1a2e] rounded-[8px] flex items-center justify-between">
          <span className="text-[13px] text-[#531dab]">
            已选择 <span className="font-semibold">{selectedRowKeys.length}</span> 个兑换码
            <span className="text-[#888] ml-[8px]">(已使用的不可操作)</span>
          </span>
          <Button
            size="small"
            onClick={() => setSelectedRowKeys([])}
            className="h-[28px] rounded-[6px] text-[12px]"
          >
            取消选择
          </Button>
        </div>
      )}

      {/* 表格 */}
      <Card className="rounded-[12px] overflow-hidden">
        <Table
          dataSource={codes}
          columns={columns}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          className="dark-table"
        />
      </Card>

      {/* 生成兑换码弹窗 */}
      <Modal
        title={<span className="text-[16px] font-semibold">生成兑换码</span>}
        open={generateModalVisible}
        onCancel={() => setGenerateModalVisible(false)}
        footer={null}
        className="dark-modal"
      >
        <Form form={form} layout="vertical" onFinish={handleGenerate} className="mt-[16px]">
          <Form.Item
            name="count"
            label={<span className="text-[14px] text-[#888]">生成数量</span>}
            rules={[{ required: true, message: '请输入生成数量' }]}
          >
            <InputNumber
              min={1}
              max={1000}
              style={{ width: '100%' }}
              placeholder="1-1000"
              className="h-[40px]"
            />
          </Form.Item>
          <Form.Item
            name="credits"
            label={<span className="text-[14px] text-[#888]">积分面值</span>}
            rules={[{ required: true, message: '请输入积分面值' }]}
          >
            <InputNumber
              min={0.01}
              step={0.1}
              style={{ width: '100%' }}
              placeholder="每张兑换码的积分值"
              className="h-[40px]"
            />
          </Form.Item>
          <Form.Item
            name="expiresInDays"
            label={<span className="text-[14px] text-[#888]">有效期（天）</span>}
          >
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              placeholder="不填则永久有效"
              className="h-[40px]"
            />
          </Form.Item>
          <Form.Item
            name="remark"
            label={<span className="text-[14px] text-[#888]">备注</span>}
          >
            <Input.TextArea rows={2} placeholder="可选备注" />
          </Form.Item>
          <Form.Item className="mb-0">
            <div className="flex gap-[12px] justify-end">
              <Button
                onClick={() => setGenerateModalVisible(false)}
                className="h-[36px] rounded-[8px]"
              >
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                className="h-[36px] px-[20px] rounded-[8px] font-medium"
                style={{ background: '#531dab', borderColor: '#531dab' }}
              >
                生成
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* 生成结果弹窗 */}
      <Modal
        title={<span className="text-[16px] font-semibold">生成结果</span>}
        open={resultModalVisible}
        onCancel={() => setResultModalVisible(false)}
        footer={
          <div className="flex gap-[12px]">
            <Button
              onClick={copyAllCodes}
              icon={<CopyOutlined />}
              className="h-[36px] rounded-[8px]"
            >
              复制全部
            </Button>
            <Button
              type="primary"
              onClick={() => setResultModalVisible(false)}
              className="h-[36px] px-[20px] rounded-[8px]"
              style={{ background: '#531dab', borderColor: '#531dab' }}
            >
              关闭
            </Button>
          </div>
        }
        width={560}
        className="dark-modal"
      >
        <div className="max-h-[320px] overflow-auto">
          <p className="text-[14px] text-[#888] mb-[12px]">
            成功生成 {generatedCodes.length} 个兑换码
          </p>
          <div className="space-y-[4px]">
            {generatedCodes.map((code, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-[#1a1a1e] px-[12px] py-[8px] rounded-[6px]"
              >
                <span className="font-mono text-[13px] text-[#e0e0e0]">{code}</span>
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copySingleCode(code)}
                  className="h-[28px] rounded-[6px]"
                />
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}