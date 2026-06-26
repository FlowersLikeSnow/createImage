'use client';

import { useEffect, useState, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthContext';
import NotFound from '@/app/not-found';
import { Layout, Menu, Spin, Button, Drawer } from 'antd';
import {
  HomeOutlined,
  GiftOutlined,
  UserOutlined,
  TeamOutlined,
  TransactionOutlined,
  MessageOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { useBreakpoint } from '@/hooks/useBreakpoint';

// 强制动态渲染，禁用静态缓存
export const dynamic = 'force-dynamic';

const { Sider, Content, Header } = Layout;

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, loading } = useAuth();
  const { isDesktop } = useBreakpoint();
  const [checked, setChecked] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      setChecked(true);
    }
  }, [loading]);

  // 路由变化时关闭抽屉
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // 加载中显示 loading
  if (loading || !checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <Spin size="large" description="加载中..." />
      </div>
    );
  }

  // 未登录或非管理员 → 显示 404
  if (!user || user.role !== 'admin') {
    return <NotFound />;
  }

  // 菜单项配置
  const menuConfig = [
    { key: '/admin', label: '概览', icon: HomeOutlined },
    { key: '/admin/users', label: '用户列表', icon: TeamOutlined },
    { key: '/admin/redemption', label: '兑换码', icon: GiftOutlined },
    { key: '/admin/credit-records', label: '消费记录', icon: TransactionOutlined },
    { key: '/admin/messages', label: '消息管理', icon: MessageOutlined },
  ];

  // 统一生成菜单项
  const menuItems = menuConfig.map(item => ({
    key: item.key,
    icon: <item.icon style={{ color: pathname === item.key ? '#531dab' : '#666' }} />,
    label: (
      <Link
        href={item.key}
        className={pathname === item.key ? 'text-[#531dab] font-medium' : 'text-[#333] hover:text-[#531dab]'}
      >
        {item.label}
      </Link>
    ),
  }));

  // 侧边栏内容（桌面端 Sider 和移动端 Drawer 复用）
  const siderContent = (
    <>
      {/* Logo 区域 */}
      <div className="h-[64px] flex items-center px-[20px] border-b border-[#e8e8e8]">
        <div className="flex items-center gap-[12px]">
          <img src="/logo-64.png" alt="AI生图助手" className="w-[32px] h-[32px] rounded-[8px]" />
          {!collapsed && (
            <span className="text-[15px] font-semibold text-[#333] tracking-tight">
              管理后台
            </span>
          )}
        </div>
      </div>

      {/* 导航菜单 */}
      <div className="flex-1 overflow-y-auto">
        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          className="border-none mt-[12px]"
          style={{ background: 'transparent' }}
        />
      </div>

      {/* 底部用户信息 */}
      {!collapsed && (
        <div className="p-[16px] border-t border-[#e8e8e8] bg-white">
          <div className="flex items-center justify-center gap-[12px]">
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
        </div>
      )}
    </>
  );

  // 内容区不再需要手动 margin-left，由 Ant Design Layout 自动处理
  return (
    <Layout className="h-screen bg-[#f5f5f5]">
      {/* 桌面端：Sider（支持折叠，折叠时显示图标） */}
      {isDesktop && (
        <Sider
          width={220}
          collapsedWidth={80}
          collapsed={collapsed}
          className="h-screen bg-white border-r border-[#e8e8e8] overflow-hidden z-10"
          theme="light"
          trigger={null}
        >
          <div className="h-full flex flex-col">
            {siderContent}
          </div>
        </Sider>
      )}

      {/* 移动端/平板端：Drawer 抽屉 */}
      {!isDesktop && (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          styles={{ body: { padding: 0 }, wrapper: { width: 260 } }}
        >
          <div className="h-full flex flex-col bg-white">
            {/* Drawer 内的菜单项不折叠，始终显示完整 */}
            <>
              <div className="h-[64px] flex items-center px-[20px] border-b border-[#e8e8e8]">
                <div className="flex items-center gap-[12px]">
                  <img src="/logo-64.png" alt="AI生图助手" className="w-[32px] h-[32px] rounded-[8px]" />
                  <span className="text-[15px] font-semibold text-[#333] tracking-tight">
                    管理后台
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Menu
                  mode="inline"
                  selectedKeys={[pathname]}
                  items={menuItems}
                  className="border-none mt-[12px]"
                  style={{ background: 'transparent' }}
                />
              </div>
              <div className="p-[16px] border-t border-[#e8e8e8] bg-white">
                <div className="flex items-center justify-center gap-[12px]">
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
              </div>
            </>
          </div>
        </Drawer>
      )}

      {/* 主内容区 */}
      <Layout className="bg-[#f5f5f5] flex flex-col h-screen">
        {/* 顶部标题栏 */}
        <Header className="h-[64px] flex items-center sticky top-0 z-10" style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', paddingInline: 'clamp(12px, 2vw, 24px)' }}>
          <div className="flex items-center gap-[12px] flex-1">
            {/* 移动端汉堡按钮 */}
            {!isDesktop && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setDrawerOpen(true)}
              />
            )}
            {/* 桌面端折叠按钮 */}
            {isDesktop && (
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
              />
            )}
            <img src="/logo-64.png" alt="AI生图助手" className="w-[28px] h-[28px] rounded-[6px]" />
            <h1 className="text-[14px] md:text-[16px] font-semibold text-[#333] tracking-tight">
              {(() => {
                const titles: Record<string, string> = {
                  '/admin': '概览',
                  '/admin/users': '用户列表',
                  '/admin/redemption': '兑换码管理',
                  '/admin/credit-records': '消费记录',
                  '/admin/messages': '消息管理',
                };
                return titles[pathname] || '管理后台';
              })()}
            </h1>
          </div>
          <Link
            href="/"
            className="text-[14px] text-[#531dab] hover:text-[#7c3aed] transition-colors font-medium"
          >
            返回前台
          </Link>
        </Header>

        {/* 内容区域 */}
        <Content className="p-[12px] md:p-[24px] bg-[#f5f5f5] overflow-y-auto flex-1">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
