'use client';

import { useCallback, useMemo, useState } from 'react';
import { Card, Image, Spin, Typography, Tooltip, Popconfirm, Empty, MenuProps, Dropdown, Space } from 'antd';
import { DownloadOutlined, DeleteOutlined, SmallDashOutlined, EllipsisOutlined } from '@ant-design/icons';
import type { Message } from '@/types/conversation';
import dayjs from 'dayjs';

interface ImageCardProps {
  img: Message;
  onDownload: (url: string) => void;
  onDelete: (id: string) => void;
  onDetails: (msg: Message) => void;
}

export function ImageCard({ img, onDownload, onDelete, onDetails }: ImageCardProps) {
  const isProcessing = img.status === 'processing';
  const isFailed = img.status === 'failed';
  const hasImage = !!img.image;
  const items: MenuProps['items'] = useMemo(() => isProcessing ? [] : [
    {
      label: '删除',
      key: 'delete',
      icon: <DeleteOutlined style={{ color: 'red' }} />,
    },
    {
      label: '下载',
      key: 'download',
      icon: <DownloadOutlined />,
      disabled: !hasImage,
    },
    {
      label: '详情',
      key: 'details',
      icon: <EllipsisOutlined />,
      disabled: !hasImage,
    },
  ], [img]);
  const onClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'delete') {
      onDelete(img.id);
    } else if (key === 'download') {
      onDownload(img.image!.url);
    } else if (key === 'details') {
      onDetails(img);
    }
  };
  return (
    <Dropdown menu={{ items, onClick }} trigger={['contextMenu']}>
      <div className='w-full'>{
        isProcessing ? (
          <div className="h-[180px] items-center justify-center bg-gray-50"
            style={{ display: 'flex' }}>
            <Spin description="正在生成..." />
          </div>
        ) : isFailed ? (
          <div className="items-center justify-center bg-gray-50"
            style={{ display: 'flex' }}>
            <Typography.Text type="danger">{img.error || '生成失败'}</Typography.Text>
          </div>
        ) : hasImage ? (
          <Image
            onClick={() => onDetails(img)}
            src={img.image!.url}
            styles={{
              cover: {
                backgroundColor: 'rgba(0, 0, 0, 0.15)'
              }
            }}
            preview={{
              open: false,
              mask: { blur: true },
              cover: (
                <div className="w-full h-full flex flex-col items-end justify-end px-[5px]">
                  <Typography.Paragraph
                    ellipsis={{ rows: 6 }}
                    className="text-sm !text-[#fff] !mb-[5px]"
                  >
                    {img.content || '无提示词'}
                  </Typography.Paragraph>
                  <Space vertical align="center">
                    <Typography.Text type="secondary" style={{ color: '#efdbff' }}>
                      {dayjs(img.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                    </Typography.Text>
                  </Space>
                </div>
              ),
            }}
          />
        ) : (
          <div className="flex items-center justify-center bg-gray-50">
            <Empty description="无图片" />
          </div>
        )}
      </div>
    </Dropdown>
  );
}