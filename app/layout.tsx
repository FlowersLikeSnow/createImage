import type { Metadata } from "next";
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthWrapper } from '@/components/AuthWrapper';
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AI生图助手 - 智能图片生成平台",
    template: "%s | AI生图助手",
  },
  description: "AI生图助手是一款智能图片生成平台，利用先进的AI技术帮助用户快速生成高质量图片。支持多种尺寸、风格生成，让创意变现更简单，探索AI生图的未来。",
  keywords: ["AI生图", "图片生成", "智能生图", "AI图片", "生图工具", "人工智能", "AI", "未来科技", "创意设计"],
  authors: [{ name: "AI生图助手" }],
  creator: "AI生图助手",
  publisher: "AI生图助手",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    title: "AI生图助手 - 智能图片生成平台",
    description: "利用先进的AI技术帮助用户快速生成高质量图片，探索AI生图的未来",
    siteName: "AI生图助手",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI生图助手 - 智能图片生成平台",
    description: "利用先进的AI技术帮助用户快速生成高质量图片",
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL,
  },
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