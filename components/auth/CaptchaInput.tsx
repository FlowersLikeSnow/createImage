'use client';

import { Input, Button, Image } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

interface CaptchaInputProps {
  value: string;
  onChange: (value: string) => void;
  captchaImage: string;
  onRefresh: () => void;
}

export function CaptchaInput({ value, onChange, captchaImage, onRefresh }: CaptchaInputProps) {
  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="验证码"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        maxLength={4}
        className="w-[100px]"
      />
      {captchaImage && (
        <Image
          src={captchaImage}
          alt="验证码"
          width={120}
          height={40}
          className="cursor-pointer"
          preview={false}
          onClick={onRefresh}
        />
      )}
      <Button
        type="text"
        icon={<ReloadOutlined />}
        onClick={onRefresh}
        title="刷新验证码"
      />
    </div>
  );
}