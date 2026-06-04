'use client';

import { Input, Button, Image, Space } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

interface CaptchaInputProps {
  value: string;
  onChange: (value: string) => void;
  captchaImage: string;
  onRefresh: () => void;
}

export function CaptchaInput({ value, onChange, captchaImage, onRefresh }: CaptchaInputProps) {
  return (
    <Space.Compact className="flex items-center w-full">
      <Input
        placeholder="验证码"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        maxLength={4}
        className="flex-auto"
      />
      {captchaImage && (
        <Image
          src={captchaImage}
          alt="验证码"
          width={90}
          height={30}
          className="cursor-pointer"
          preview={false}
          onClick={onRefresh}
        />
      )}
    </Space.Compact>
  );
}