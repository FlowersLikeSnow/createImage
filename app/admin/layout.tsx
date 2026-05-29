'use client';

import { useEffect, useState, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthContext';
import NotFound from '@/app/not-found';
import { Layout, Menu, Spin } from 'antd';
import {
  HomeOutlined,
  GiftOutlined,
  UserOutlined,
} from '@ant-design/icons';

const { Sider, Content, Header } = Layout;

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, loading } = useAuth();
  const [checked, setChecked] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      setChecked(true);
    }
  }, [loading]);

  // 加载中显示 loading
  if (loading || !checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  // 未登录或非管理员 → 显示 404
  if (!user || user.role !== 'admin') {
    return <NotFound />;
  }

  // 菜单项
  const menuItems = [
    {
      key: '/admin',
      icon: <HomeOutlined />,
      label: <Link href="/admin">首页</Link>,
    },
    {
      key: '/admin/redemption',
      icon: <GiftOutlined />,
      label: <Link href="/admin/redemption">兑换码管理</Link>,
    },
  ];

  return (
    <Layout className="h-screen">
      <Sider width={200} className="bg-white border-r border-gray-200">
        <div className="h-16 flex items-center justify-center border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-800">管理后台</h1>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          className="border-none"
        />
      </Sider>
      <Layout>
        <Header className="bg-white border-b border-gray-200 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserOutlined className="text-gray-500" />
            <span className="text-gray-600">{user.nickname}</span>
            <span className="text-xs text-gray-400">(管理员)</span>
          </div>
          <Link href="/" className="text-blue-500 hover:text-blue-600">
            返回前台
          </Link>
        </Header>
        <Content className="p-6 bg-gray-50">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}