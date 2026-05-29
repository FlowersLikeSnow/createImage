'use client';

import { useState, useEffect } from 'react';
import {
  Card,
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
  Popover,
} from 'antd';
import { PlusOutlined, CopyOutlined, ReloadOutlined } from '@ant-design/icons';
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

  const columns = [
    {
      title: '兑换码',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => (
        <Space>
          <Text copyable={{ text: code }}>{code}</Text>
        </Space>
      ),
    },
    {
      title: '积分',
      dataIndex: 'credits',
      key: 'credits',
      render: (credits: number) => <Tag color="blue">{credits}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config = {
          unused: { color: 'green', text: '未使用' },
          used: { color: 'default', text: '已使用' },
          disabled: { color: 'red', text: '已禁用' },
        };
        const { color, text } = config[status as keyof typeof config] || { color: 'default', text: status };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (ts: number) => new Date(ts).toLocaleString('zh-CN'),
    },
    {
      title: '过期时间',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      render: (ts: number) => ts ? new Date(ts).toLocaleString('zh-CN') : '永久有效',
    },
    {
      title: '使用者',
      dataIndex: 'usedBy',
      key: 'usedBy',
      render: (usedBy: string) => usedBy || '-',
    },
    {
      title: '使用时间',
      dataIndex: 'usedAt',
      key: 'usedAt',
      render: (ts: number) => ts ? new Date(ts).toLocaleString('zh-CN') : '-',
    },
  ];

  return (
    <div>
      <Card
        title="兑换码管理"
        extra={
          <Space>
            <Select
              placeholder="状态筛选"
              allowClear
              style={{ width: 120 }}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value || '')}
              options={[
                { value: 'unused', label: '未使用' },
                { value: 'used', label: '已使用' },
                { value: 'disabled', label: '已禁用' },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={loadCodes}>
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setGenerateModalVisible(true)}
            >
              生成兑换码
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={codes}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 生成兑换码弹窗 */}
      <Modal
        title="生成兑换码"
        open={generateModalVisible}
        onCancel={() => setGenerateModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleGenerate}>
          <Form.Item
            name="count"
            label="生成数量"
            rules={[{ required: true, message: '请输入生成数量' }]}
          >
            <InputNumber
              min={1}
              max={1000}
              style={{ width: '100%' }}
              placeholder="1-1000"
            />
          </Form.Item>
          <Form.Item
            name="credits"
            label="积分面值"
            rules={[{ required: true, message: '请输入积分面值' }]}
          >
            <InputNumber
              min={0.01}
              step={0.1}
              style={{ width: '100%' }}
              placeholder="每张兑换码的积分值"
            />
          </Form.Item>
          <Form.Item name="expiresInDays" label="有效期（天）">
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              placeholder="不填则永久有效"
            />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="可选备注" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                生成
              </Button>
              <Button onClick={() => setGenerateModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 生成结果弹窗 */}
      <Modal
        title="生成结果"
        open={resultModalVisible}
        onCancel={() => setResultModalVisible(false)}
        footer={
          <Space>
            <Button onClick={copyAllCodes} icon={<CopyOutlined />}>
              复制全部
            </Button>
            <Button type="primary" onClick={() => setResultModalVisible(false)}>
              关闭
            </Button>
          </Space>
        }
        width={600}
      >
        <div className="max-h-64 overflow-auto">
          <p className="mb-2 text-gray-500">
            成功生成 {generatedCodes.length} 个兑换码：
          </p>
          <div className="space-y-1">
            {generatedCodes.map((code, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded">
                <Text>{code}</Text>
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copySingleCode(code)}
                />
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}