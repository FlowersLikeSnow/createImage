'use client';

import { Masonry, Spin, Typography } from 'antd';
import { Sparkles } from 'lucide-react';
import type { Message } from '@/types/conversation';
import { ImageCard } from '../ImageCard';

interface ChatImageGridProps {
  images: Message[];
  loadingImages: boolean;
  isMobile: boolean;
  isTablet: boolean;
  onDownload: (url: string) => void;
  onDelete: (id: string) => void;
  onDetails: (msg: Message) => void;
}

export function ChatImageGrid({
  images,
  loadingImages,
  isMobile,
  isTablet,
  onDownload,
  onDelete,
  onDetails,
}: ChatImageGridProps) {
  return (
    <div className="flex-1 overflow-y-auto py-[10px] md:py-[20px]">
      {loadingImages ? (
        <div className="flex items-center justify-center h-full">
          <Spin description="加载历史图片..." />
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <div className='p-[13px] rounded-[50%] bg-[#F6F7F9]  flex items-center justify-center mb-[10px]'>
            <Sparkles size={30} color='#C9CBCD' />
          </div>
          <Typography.Text className="text-lg">输入提示词开始生成图片</Typography.Text>
          <Typography.Text className="text-sm mt-2">支持扩写提示词、选择尺寸比例</Typography.Text>
        </div>
      ) : (
        <div className="w-full box-border pr-[10px] pb-[2px]">
          <Masonry
            columns={isMobile ? 2 : isTablet ? 2 : 4}
            gutter={isMobile ? 8 : 4}
            items={images
              .filter((img): img is Message => !!img && !!img.id)
              .map((img) => ({
                key: img.id,
                data: img,
              }))}
            itemRender={({ data }) => {
              if (!data?.id) return null;
              return (
                <ImageCard
                  key={data.id}
                  img={data}
                  onDownload={onDownload}
                  onDelete={onDelete}
                  onDetails={onDetails}
                />
              );
            }}
          />
        </div>
      )}
    </div>
  );
}
