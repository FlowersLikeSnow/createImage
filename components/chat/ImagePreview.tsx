'use client';

import { Button, Spin, Image } from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import type { GeneratedImage } from '@/types/conversation';

interface ImagePreviewProps {
  images: GeneratedImage[];
  onRegenerate?: () => void;
  loading?: boolean;
}

export function ImagePreview({ images, onRegenerate, loading }: ImagePreviewProps) {
  const { isMobile } = useBreakpoint();
  const imgSize = isMobile ? 120 : 200;
  const handleDownload = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-${Date.now()}.png`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spin size="large" description="正在生成图片..." />
      </div>
    );
  }

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-4">
      <Image.PreviewGroup>
        {images.map((img) => (
          <div key={img.id} className="relative">
            <Image
              src={img.url}
              alt="Generated image"
              width={imgSize}
              height={imgSize}
              className="rounded-lg"
              placeholder
            />
            <div className="absolute bottom-2 right-2 flex gap-2">
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => handleDownload(img.url)}
              />
              {onRegenerate && (
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={onRegenerate}
                />
              )}
            </div>
          </div>
        ))}
      </Image.PreviewGroup>
    </div>
  );
}