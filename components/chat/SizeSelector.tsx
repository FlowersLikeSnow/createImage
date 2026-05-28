'use client';

import { useState } from 'react';
import { Select } from 'antd';
import { IMAGE_SIZE_OPTIONS, DEFAULT_IMAGE_SIZE } from '@/lib/utils/size-config';

interface SizeSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
}

export function SizeSelector({ value, onChange }: SizeSelectorProps) {
  const [selectedSize, setSelectedSize] = useState(value || DEFAULT_IMAGE_SIZE);

  const handleChange = (val: string) => {
    setSelectedSize(val);
    onChange?.(val);
  };

  return (
    <Select
      value={selectedSize}
      onChange={handleChange}
      options={IMAGE_SIZE_OPTIONS.map(opt => ({
        value: opt.value,
        label: opt.label,
      }))}
      style={{ width: 120 }}
      size="large"
    />
  );
}