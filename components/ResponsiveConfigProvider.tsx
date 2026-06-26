'use client';

import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useBreakpoint } from '@/hooks/useBreakpoint';

export function ResponsiveConfigProvider({ children }: { children: React.ReactNode }) {
  const { isMobile } = useBreakpoint();

  return (
    <ConfigProvider locale={zhCN} componentSize={isMobile ? 'small' : 'middle'}>
      {children}
    </ConfigProvider>
  );
}
