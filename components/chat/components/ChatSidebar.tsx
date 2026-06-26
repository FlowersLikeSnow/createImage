'use client';

import { Button, Card, Flex, Menu, Tooltip, Typography } from 'antd';
import { Coins } from 'lucide-react';
import { Sparkles } from 'lucide-react';

interface ChatSidebarProps {
  activeMenu: string;
  onMenuClick: (key: string) => void;
  onContactClick: () => void;
  onRedeemClick: () => void;
  processingCount: number;
  userCredits: number;
  showLogo?: boolean;
  isMobile: boolean;
}

const menuItems = [
  { key: 'ai-image', label: 'AI生图' },
  { key: 'contact', label: '联系客服' },
];

export function ChatSidebar({
  activeMenu,
  onMenuClick,
  onContactClick,
  onRedeemClick,
  processingCount,
  userCredits,
  showLogo = true,
  isMobile,
}: ChatSidebarProps) {
  const handleMenuClick = (e: { key: string }) => {
    if (e.key === 'contact') {
      onContactClick();
    } else {
      onMenuClick(e.key);
    }
    if (isMobile) {
      // 移动端点击后关闭抽屉（由父组件处理）
    }
  };

  return (
    <>
      {/* 顶部 AI 标识 - 仅在桌面端显示 */}
      {showLogo && (
        <div className="px-[10px] py-[6px] border-gray-200">
          <Flex align="center" gap="small">
            <img src="/logo-64.png" alt="AI生图助手" className='w-[24px] h-[24px] rounded-[8px] shadow-md shrink-0' />
            <Typography.Text className="text-sm font-medium">GPT-Image-2</Typography.Text>
          </Flex>
        </div>
      )}

      {/* 菜单 */}
      <Menu
        mode="inline"
        selectedKeys={[activeMenu]}
        onClick={handleMenuClick}
        items={menuItems}
        style={{ border: 'none', background: '#F8F9FA' }}
        className="compact-menu"
      />

      {/* 底部状态面板 */}
      <div className="mt-auto p-[10px] py-[6px] border-gray-200 bg-white">
        <Card size="small" className="bg-gray-50">
          <div className="space-y-3">
            {/* 进行中任务 */}
            <Flex justify="space-between" align="center">
              <div className="text-[12px] text-[#666] font-[500]">进行中任务</div>
              <div className="text-[12px] text-gray-500">
                <span className="font-medium">{processingCount}</span>
              </div>
            </Flex>
            {/* 剩余积分 */}
            <Flex justify="space-between" align="center">
              <div className="text-[12px] text-[#666] font-[500]">剩余积分</div>
              <div className="text-[12px] font-medium text-orange-500">
                {userCredits.toFixed(2) || '0.00'}
              </div>
            </Flex>
            <Flex justify="center" align="center" gap="small">
              <Button size="small" shape="round" color='geekblue' variant="filled"
                style={{ fontSize: 12 }}
                icon={<Coins size={12} color='#531dab' strokeWidth={1} />}
                onClick={onRedeemClick}>
                兑换
              </Button>
              <Tooltip title="暂未开放">
                <Button size="small" shape="round" color='orange' variant="filled"
                  style={{ fontSize: 12 }}
                  disabled
                  icon={<Sparkles size={12} color='#531dab' strokeWidth={1} />}>
                  充值
                </Button>
              </Tooltip>
            </Flex>
          </div>
        </Card>
      </div>
    </>
  );
}
