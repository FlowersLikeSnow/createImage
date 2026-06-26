'use client';

import { Alert, Button, Flex, Typography } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import { UserAvatar } from '@/components/auth/UserAvatar';
import Marquee from 'react-fast-marquee';

interface ChatTopBarProps {
  isDesktop: boolean;
  isMobile: boolean;
  onMenuClick: () => void;
}

export function ChatTopBar({ isDesktop, isMobile, onMenuClick }: ChatTopBarProps) {
  return (
    <div className={`bg-gray-800 text-white px-3 md:px-6 py-2 md:py-3 flex items-center flex-wrap gap-2`}>
      {/* 第一行：汉堡 + logo + 标题 + 用户头像 */}
      <Flex align="center" gap={8}>
        {!isDesktop && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={onMenuClick}
            className="!text-white"
          />
        )}
        <img src="/logo-64.png" alt="AI生图助手" className='w-[24px] h-[24px] rounded-[8px] shrink-0' />
        <Typography.Title level={4} className="!text-white whitespace-nowrap" style={{ marginBottom: 0 }}>
          AI生图
        </Typography.Title>
      </Flex>
      <div className="ml-auto">
        <UserAvatar />
      </div>
      {/* 第二行：Alert 通栏 */}
      <div className='w-full mt-[5px]'>
        <Alert
          banner
          title={
            <Marquee pauseOnHover gradient={false}>
              ✨ AI生图助手 - 智能图片生成平台 | 支持多种尺寸、并发生成 | 💰 充值兑换在左下角「积分」按钮
            </Marquee>
          }
        />
      </div>
    </div>
  );
}
