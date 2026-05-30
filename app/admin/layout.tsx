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
  TeamOutlined,
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
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  // 未登录或非管理员 → 显示 404
  if (!user || user.role !== 'admin') {
    return <NotFound />;
  }

  // 菜单项 - 使用更亮的文字颜色
  const menuItems = [
    {
      key: '/admin',
      icon: <HomeOutlined style={{ color: pathname === '/admin' ? '#531dab' : '#666' }} />,
      label: (
        <Link
          href="/admin"
          className={pathname === '/admin' ? 'text-[#531dab] font-medium' : 'text-[#333] hover:text-[#531dab]'}
        >
          概览
        </Link>
      ),
    },
    {
      key: '/admin/users',
      icon: <TeamOutlined style={{ color: pathname === '/admin/users' ? '#531dab' : '#666' }} />,
      label: (
        <Link
          href="/admin/users"
          className={pathname === '/admin/users' ? 'text-[#531dab] font-medium' : 'text-[#333] hover:text-[#531dab]'}
        >
          用户列表
        </Link>
      ),
    },
    {
      key: '/admin/redemption',
      icon: <GiftOutlined style={{ color: pathname === '/admin/redemption' ? '#531dab' : '#666' }} />,
      label: (
        <Link
          href="/admin/redemption"
          className={pathname === '/admin/redemption' ? 'text-[#531dab] font-medium' : 'text-[#333] hover:text-[#531dab]'}
        >
          兑换码
        </Link>
      ),
    },
  ];

  return (
    <Layout className="h-screen bg-[#f5f5f5]">
      {/* 侧边栏 */}
      <Sider
        width={220}
        className="bg-white border-r border-[#e8e8e8]"
        theme="light"
      >
        {/* Logo 区域 */}
        <div className="h-[64px] flex items-center px-[20px] border-b border-[#e8e8e8]">
          <div className="flex items-center gap-[12px]">
            <div className="w-[32px] h-[32px] rounded-[8px] bg-[#531dab] flex items-center justify-center">
              <GiftOutlined className="text-white text-[16px]" />
            </div>
            <span className="text-[15px] font-semibold text-[#333] tracking-tight">
              管理后台
            </span>
          </div>
        </div>

        {/* 导航菜单 */}
        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          className="border-none mt-[12px]"
          style={{
            background: 'transparent',
          }}
        />

        {/* 底部用户信息 */}
        <div className="absolute bottom-0 left-0 right-0 p-[16px] border-t border-[#e8e8e8] bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[12px]">
              <div className="w-[36px] h-[36px] rounded-[8px] bg-[#faad14] flex items-center justify-center">
                <UserOutlined className="text-white text-[14px]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] text-[#333] font-medium">
                  {user.nickname}
                </span>
                <span className="text-[11px] text-[#888]">管理员</span>
              </div>
            </div>
            <Link
              href="/"
              className="text-[12px] text-[#531dab] hover:text-[#7c3aed] transition-colors font-medium"
            >
              返回前台
            </Link>
          </div>
        </div>
      </Sider>

      {/* 主内容区 */}
      <Layout className="bg-[#f5f5f5] flex flex-col">
        {/* 顶部标题栏 */}
        <Header className="bg-white border-b border-[#e8e8e8] px-[24px] h-[64px] flex items-center">
          <h1 className="text-[16px] font-semibold text-[#fff] tracking-tight">
            {pathname === '/admin' ? '概览' : pathname === '/admin/users' ? '用户列表' : pathname === '/admin/redemption' ? '兑换码管理' : '管理后台'}
          </h1>
        </Header>

        {/* 内容区域 */}
        <Content className="p-[24px] bg-[#f5f5f5] flex-auto ">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}