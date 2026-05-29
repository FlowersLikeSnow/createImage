'use client';

import { useState } from 'react';
import { Card, Image, Spin, Typography, Tooltip, Popconfirm, Empty } from 'antd';
import { DownloadOutlined, DeleteOutlined } from '@ant-design/icons';
import type { Message } from '@/types/conversation';

interface ImageCardProps {
  img: Message;
  onDownload: (url: string) => void;
  onDelete: (id: string) => void;
}

export function ImageCard({ img, onDownload, onDelete }: ImageCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isProcessing = img.status === 'processing';
  const isFailed = img.status === 'failed';
  const hasImage = img.generatedImages && img.generatedImages.length > 0;

  return (
    <Card
      className="w-[280px] shadow-sm"
      cover={
        isProcessing ? (
          <div className="h-[180px] items-center justify-center bg-gray-50"
            style={{ display: 'flex' }}>
            <Spin description="正在生成..." />
          </div>
        ) : isFailed ? (
          <div className="h-[180px] items-center justify-center bg-gray-50"
            style={{ display: 'flex' }}>
            <Typography.Text type="danger">{img.error || '生成失败'}</Typography.Text>
          </div>
        ) : hasImage ? (
          <Image
            src={img.generatedImages![0].url}
            alt="generated"
            style={{ height: 180, objectFit: 'cover' }}
            preview={{ mask: '预览' }}
          />
        ) : (
          <div className="h-[180px] flex items-center justify-center bg-gray-50">
            <Empty description="无图片" />
          </div>
        )
      }
      actions={
        isProcessing ? [] : [
          hasImage && (
            <Tooltip title="下载" key="download">
              <DownloadOutlined onClick={() => onDownload(img.generatedImages![0].url)} />
            </Tooltip>
          ),
          <Popconfirm
            title="确认删除"
            description="删除后无法恢复"
            onConfirm={() => onDelete(img.id)}
            okText="删除"
            cancelText="取消"
            key="delete"
          >
            <DeleteOutlined className="text-red-500" />
          </Popconfirm>,
        ].filter(Boolean)
      }
    >
      <Card.Meta
        description={
          <Typography.Paragraph
            ellipsis={{
              rows: 2,
              expanded,
              expandable: 'collapsible',
              onExpand: (_, info) => setExpanded(info.expanded),
            }}
            className="text-sm text-gray-600 !mb-2"
          >
            {img.content || '无提示词'}
          </Typography.Paragraph>
        }
      />
      <Typography.Text type="secondary" className="text-xs">
        {new Date(img.createdAt).toLocaleString()}
      </Typography.Text>
    </Card>
  );
}