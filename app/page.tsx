import { ChatContainer } from '@/components/chat/ChatContainer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "AI生图助手 - 智能图片生成平台 | 探索AI生图的未来",
  description: "AI生图助手是一款智能图片生成平台，利用先进的AI技术帮助用户快速生成高质量图片。支持多种尺寸、风格生成，让创意变现更简单。探索AI生图的未来，体验智能图片生成的魅力。",
  keywords: "AI生图,图片生成,智能生图,AI图片,生图工具,人工智能,AI,未来科技,创意设计,AI绘画,智能创作",
  openGraph: {
    title: "AI生图助手 - 智能图片生成平台",
    description: "利用先进的AI技术帮助用户快速生成高质量图片，探索AI生图的未来",
    type: "website",
  },
};

export default function Home() {
  return (
    <>
      {/* JSON-LD 结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "AI生图助手",
            "description": "智能图片生成平台，利用先进的AI技术帮助用户快速生成高质量图片",
            "applicationCategory": "MultimediaApplication",
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "CNY",
            },
            "featureList": [
              "AI智能生图",
              "多种尺寸支持",
              "高质量图片生成",
              "创意设计辅助",
            ],
            "keywords": ["AI生图", "图片生成", "智能", "AI", "未来"],
          }),
        }}
      />
      <ChatContainer />
    </>
  );
}