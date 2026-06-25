'use client';

import { Drawer, Image, Button, Typography, Space, Tag, Divider } from 'antd';
import { HeartOutlined, LikeOutlined, CopyOutlined, DownloadOutlined, CloseOutlined } from '@ant-design/icons';
import { Message } from '@/types/conversation';
import { useAuth } from '@/components/auth/AuthContext';
import dayjs from 'dayjs';

interface ImageDetailsModalProps {
  visible: boolean;
  image: Message | null;
  onClose: () => void;
  onDownload: (url: string) => void;
}

export function ImageDetailsModal({ visible, image, onClose, onDownload }: ImageDetailsModalProps) {
  const { user } = useAuth();

  if (!image || !image.image) return null;

  const handleCopyPrompt = () => {
    if (image.content) {
      navigator.clipboard.writeText(image.content);
    }
  };

  return (
    <Drawer
      open={visible}
      onClose={onClose}
      size="100%"
      getContainer=".content-main"
      styles={{
        root: { position: 'absolute', overflow: 'hidden' },
        section: { padding: 0, width: '100%', backgroundColor: '#F8F9FA' },
        header: { display: 'none' }
      }}
    >
      <div className="flex w-full h-full">
        {/* 左侧：图片预览 */}
        <div className="flex-auto h-full bg-gray-900 flex items-center justify-center relative overflow-hidden">
          <Image
            src={image.image.url}
            alt="generated"
            className="!h-full !w-full object-scale-down"
            classNames={{
              root: 'h-full w-full',
              cover: '!hidden'
            }}
          />
          <Button
            type="text"
            icon={<CloseOutlined style={{fontWeight: 'bold', fontSize: '20px' }} />}
            onClick={onClose}
            style={{ position: 'absolute', top: 10, right: 20 }}
            size="large"
            color="default"
            variant='filled'
          />
        </div>
          <Divider orientation="vertical" size="large" style={{ height: '100%' }} />
        {/* 右侧：详情信息 */}
        <div className="w-[400px] min-w-[400px] bg-white flex flex-col overflow-y-auto px-[16px] box-border">
          {/* 头部：用户信息 */}
          <div className="pt-[10px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-[32px] h-[32px] mr-[8px] rounded-full bg-[purple] flex items-center justify-center text-[white] text-sm font-medium">
                  {user?.nickname?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <Typography.Text className="font-medium text-sm">{user?.nickname || '用户'}</Typography.Text>
                  <Typography.Text type="secondary" className="text-xs block">
                    {dayjs(image.createdAt).format('YYYY-MM-DD')}
                  </Typography.Text>
                </div>
              </div>
              <Tag color="blue" className="text-xs">内容由 AI 生成</Tag>
            </div>
          </div>
          <Divider size="medium" />
          {/* 提示词区域 */}
          <div className="p-4 flex-1">
            <div className="mb-3">
              <Typography.Paragraph
              style={{color: '#72808A',marginBottom: '8px'}}>
                图片提示词
              </Typography.Paragraph>
              <Typography.Text className="text-gray-600 text-sm leading-relaxed">
                {image.content || '无提示词'}
              </Typography.Text>
            </div>

            {/* 图片参数 */}
            <div className="mt-[10px] flex items-center gap-[8px] text-xs text-[#72808A]">
              <span>图片 {image.imageSize || '1024x1024'}</span>
              <span>|</span>
              <span>{dayjs(image.createdAt).format('HH:mm')}</span>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}