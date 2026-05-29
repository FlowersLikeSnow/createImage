'use client';

import { useState } from 'react';
import { Avatar, Dropdown, Button } from 'antd';
import { UserOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuth } from './AuthContext';

export function UserAvatar() {
  const { user, showLoginModal, logout, showProfileModal } = useAuth();
  const [registerModalVisible, setRegisterModalVisible] = useState(false);

  if (!user) {
    return (
      <Button
        type="text"
        className="!text-white hover:!text-gray-200"
        onClick={showLoginModal}
      >
        未登录
      </Button>
    );
  }

  const menuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: showProfileModal,
    },
    {
      key: 'nickname',
      label: <span className="text-gray-500 text-xs">{user.nickname}</span>,
      disabled: true,
    },
    { type: 'divider' as const, key: 'd1' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: logout,
      danger: true,
    },
  ];

  return (
    <Dropdown
      menu={{ items: menuItems }}
      placement="bottomRight"
      trigger={['click']}
    >
      <div className="flex items-center gap-2 cursor-pointer">
        <Avatar
          className="bg-blue-500 cursor-pointer"
          icon={<UserOutlined />}
        >
          {user.nickname?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
        </Avatar>
        <span className="text-white text-sm hidden sm:inline">
          {user.nickname}
        </span>
      </div>
    </Dropdown>
  );
}