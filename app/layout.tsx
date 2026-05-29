import type { Metadata } from "next";
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthWrapper } from '@/components/AuthWrapper';
import "./globals.css";

export const metadata: Metadata = {
  title: "AI生图助手",
  description: "AI图片生成助手",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <AntdRegistry>
          <ConfigProvider locale={zhCN}>
            <AuthWrapper>
              {children}
            </AuthWrapper>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}