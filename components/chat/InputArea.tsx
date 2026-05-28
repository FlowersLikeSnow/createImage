'use client';

import { useState } from 'react';
import { Button, Input, Upload, message, Image } from 'antd';
import { UploadOutlined, ThunderboltOutlined, SendOutlined } from '@ant-design/icons';
import { SizeSelector } from './SizeSelector';
import type { UploadFile } from 'antd/es/upload/interface';
import { DEFAULT_IMAGE_SIZE } from '@/lib/utils/size-config';

interface InputAreaProps {
  onSend: (prompt: string, imageSize: string, referenceImage?: string) => void;
  onExpand: (prompt: string) => Promise<string>;
  loading?: boolean;
  expandLoading?: boolean;
}

export function InputArea({ onSend, onExpand, loading, expandLoading }: InputAreaProps) {
  const [prompt, setPrompt] = useState('');
  const [imageSize, setImageSize] = useState(DEFAULT_IMAGE_SIZE);
  const [referenceImage, setReferenceImage] = useState<string | undefined>();
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const handleSend = () => {
    if (!prompt.trim()) {
      message.warning('请输入提示词');
      return;
    }
    onSend(prompt.trim(), imageSize, referenceImage);
    setPrompt('');
    setFileList([]);
    setReferenceImage(undefined);
  };

  const handleExpand = async () => {
    if (!prompt.trim()) {
      message.warning('请输入提示词后再扩写');
      return;
    }
    const expanded = await onExpand(prompt.trim());
    if (expanded) {
      setPrompt(expanded);
      message.success('提示词已扩写');
    }
  };

  const handleUpload = (info: any) => {
    setFileList(info.fileList);
    if (info.file.status === 'done') {
      const imageUrl = info.file.response?.url;
      if (imageUrl) {
        setReferenceImage(imageUrl);
        message.success('图片上传成功');
      }
    } else if (info.file.status === 'error') {
      message.error('图片上传失败');
    }
  };

  return (
    <div className="border-t bg-white p-4">
      {/* 参考图预览 */}
      {referenceImage && (
        <div className="mb-2">
          <Image src={referenceImage} width={100} height={100} className="rounded" />
          <Button size="small" onClick={() => { setReferenceImage(undefined); setFileList([]); }}>
            移除
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* 上传按钮 */}
        <Upload
          action="/api/upload"
          listType="picture"
          fileList={fileList}
          onChange={handleUpload}
          maxCount={1}
          accept="image/*"
          showUploadList={false}
        >
          <Button icon={<UploadOutlined />} size="large">
            上传
          </Button>
        </Upload>

        {/* 扩写按钮 */}
        <Button
          icon={<ThunderboltOutlined />}
          size="large"
          onClick={handleExpand}
          loading={expandLoading}
          disabled={!prompt.trim() || loading}
        >
          扩写
        </Button>

        {/* 尺寸选择 */}
        <SizeSelector value={imageSize} onChange={setImageSize} />

        {/* 输入框 */}
        <Input
          placeholder="输入提示词描述你想要生成的图片..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onPressEnter={handleSend}
          size="large"
          className="flex-1"
          disabled={loading}
        />

        {/* 发送按钮 */}
        <Button
          type="primary"
          icon={<SendOutlined />}
          size="large"
          onClick={handleSend}
          loading={loading}
          disabled={!prompt.trim()}
        >
          发送
        </Button>
      </div>
    </div>
  );
}