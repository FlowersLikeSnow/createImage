'use client';

import { Modal, Typography, Card, Tag, Button } from 'antd';
import { CrownOutlined, ThunderboltOutlined, RocketOutlined, GoldOutlined, TeamOutlined, StarOutlined } from '@ant-design/icons';

interface ContactModalProps {
  visible: boolean;
  onClose: () => void;
}

// 充值套餐配置
const rechargePackages = [
  {
    key: 'basic',
    name: '基础版',
    price: 10,
    credits: 10,
    icon: <StarOutlined />,
    color: '#8c8c8c',
    badge: null,
  },
  {
    key: 'advanced',
    name: '进阶版',
    price: 29,
    credits: 30,
    icon: <ThunderboltOutlined />,
    color: '#1890ff',
    badge: '好东西只能优惠一点',
  },
  {
    key: 'super',
    name: '超级版',
    price: 55,
    credits: 60,
    icon: <RocketOutlined />,
    color: '#722ed1',
    badge: null,
  },
  {
    key: 'premium',
    name: '高级版',
    price: 100,
    credits: 115,
    icon: <GoldOutlined />,
    color: '#13c2c2',
    badge: null,
  },
  {
    key: 'business',
    name: '商务版',
    price: 300,
    credits: 360,
    icon: <TeamOutlined />,
    color: '#fa8c16',
    badge: null,
  },
  {
    key: 'ultimate',
    name: '至尊版',
    price: 500,
    credits: 600,
    icon: <CrownOutlined />,
    color: '#f5222d',
    badge: '限时超级特惠',
  },
];

export function ContactModal({ visible, onClose }: ContactModalProps) {
  return (
    <Modal
      title="充值中心"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={900}
      centered
    >
      <div className="flex gap-6">
        {/* 左侧充值区域 */}
        <div className="flex-1">
          <Typography.Title level={5} className="!mb-4 !text-gray-600">
            选择充值套餐
          </Typography.Title>
          <div className="grid grid-cols-3 gap-[10px]">
            {rechargePackages.map(pkg => (
              <Card
                key={pkg.key}
                className="cursor-pointer hover:shadow-md transition-shadow relative"
                styles={{ body: { padding: 16, position: 'relative', backgroundColor: '#f5f5f5' } }}
                hoverable
              >
                {/* 徽标 */}
                {pkg.badge && (
                  <Tag
                    color="red"
                    style={{ borderRadius: 4, position: 'absolute', top: 0, right: 0 }}
                  >
                    {pkg.badge}
                  </Tag>
                )}
                {/* 图标和名称 */}
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ color: pkg.color, fontSize: 20, marginRight: 8 }}>{pkg.icon}</span>
                  <Typography.Text className="font-medium">{pkg.name}</Typography.Text>
                </div>
                {/* 价格 */}
                <div className="mb-2">
                  <Typography.Text style={{ color: pkg.color, fontSize: 18, fontWeight: 'bold' }}>
                    ￥{pkg.price}
                  </Typography.Text>
                </div>
                {/* 积分 */}
                <div className="flex items-center gap-1">
                  <Typography.Text className="text-sm text-gray-500">
                    获取
                  </Typography.Text>
                  <Typography.Text className="text-sm font-medium" style={{ color: pkg.color }}>
                    {pkg.credits}积分
                  </Typography.Text>
                </div>
              </Card>
            ))}
          </div>
          <Typography.Text className="text-xs text-gray-400 mt-3 block">
            * 充值请联系客服
          </Typography.Text>
        </div>

        {/* 分隔线 */}
        <div className="w-[1px] bg-gray-200" />

        {/* 右侧客服区域 */}
        <div className="w-[250px] flex flex-col items-center">
          <Typography.Title level={5} className="!mb-4 !text-gray-600">
            联系客服
          </Typography.Title>
          <img
            src="http://love.img.lijundong.cn/site/wx.png"
            alt="客服微信"
            className="w-[200px] h-[200px] rounded-lg"
          />
          <Typography.Text className="text-gray-500 mt-3 text-sm">
            扫描二维码添加客服微信
          </Typography.Text>
          <Typography.Text className="text-gray-400 mt-1 text-xs">
            咨询问题、人工充值、合作洽谈
          </Typography.Text>
        </div>
      </div>
    </Modal>
  );
}