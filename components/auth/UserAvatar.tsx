'use client';

import Link from 'next/link';
import { Avatar, Dropdown, Button, Tag } from 'antd';
import { UserOutlined, SettingOutlined, LogoutOutlined, CrownOutlined } from '@ant-design/icons';
import { useAuth } from './AuthContext';

export function UserAvatar() {
  const { user, showLoginModal, logout, showProfileModal } = useAuth();

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

  // 角色显示配置
  const roleConfig = {
    admin: { text: '管理员', color: 'gold', icon: <CrownOutlined /> },
    user: { text: '普通用户', color: 'blue', icon: <UserOutlined /> },
  };
  const roleInfo = roleConfig[user.role] || roleConfig.user;

  const menuItems = [
    {
      key: 'nickname',
      label: (
        <div className="flex flex-col gap-1">
          <span className="text-gray-700 text-sm font-medium">{user.nickname}</span>
          <Tag color={roleInfo.color} icon={roleInfo.icon} className="text-xs">
            {roleInfo.text}
          </Tag>
        </div>
      ),
      disabled: true,
    },
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: showProfileModal,
    },
    // 管理员显示管理后台入口
    ...(user.role === 'admin' ? [{
      key: 'admin',
      icon: <SettingOutlined />,
      label: <Link href="/admin" className="text-gray-700">管理后台</Link>,
    }] : []),
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
          className={user.role === 'admin' ? 'bg-gold-500 cursor-pointer' : 'bg-blue-500 cursor-pointer'}
          style={user.role === 'admin' ? { backgroundColor: '#faad14' } : {}}
          icon={user.avatar ? undefined : <UserOutlined />}
          src={user.avatar}
        >
          {!user.avatar && (user.nickname?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase())}
        </Avatar>
        <span className="text-white text-sm hidden sm:inline">
          {user.nickname}
        </span>
        {/* {user.role === 'admin' && (
          <CrownOutlined className="text-gold-400 hidden sm:inline" style={{ color: '#faad14' }} />
        )} */}
      </div>
    </Dropdown>
  );
}