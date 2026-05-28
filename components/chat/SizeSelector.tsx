'use client';

import { useState } from 'react';
import { Select, Space, Tag } from 'antd';
import { DEFAULT_IMAGE_SIZE, getSizesByLevel } from '@/lib/utils/size-config';

interface SizeSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
}

export function SizeSelector({ value, onChange }: SizeSelectorProps) {
  const [selectedSize, setSelectedSize] = useState(value || DEFAULT_IMAGE_SIZE);
  const [selectedLevel, setSelectedLevel] = useState<'1K' | '2K' | '4K'>('1K');

  const handleLevelChange = (level: '1K' | '2K' | '4K') => {
    setSelectedLevel(level);
    const sizes = getSizesByLevel(level);
    if (sizes.length > 0) {
      const newSize = sizes[0].value;
      setSelectedSize(newSize);
      onChange?.(newSize);
    }
  };

  const handleSizeChange = (val: string) => {
    setSelectedSize(val);
    onChange?.(val);
  };

  // 获取当前分辨率等级下的尺寸选项
  const currentSizes = getSizesByLevel(selectedLevel);

  return (
    <Space.Compact>
      <Select
        value={selectedLevel}
        onChange={handleLevelChange}
        options={[
          { value: '1K', label: '1K' },
          { value: '2K', label: '2K' },
          { value: '4K', label: '4K' },
        ]}
        style={{ width: 60 }}
        styles={{
          root: {
            borderRadius: '20px 0 0 20px',
          }
        }}
                    variant="filled" 
      />
      <Select
        value={selectedSize}
        onChange={handleSizeChange}
        options={currentSizes.map(opt => ({
          value: opt.value,
          label: <div className="flex items-center">
            <div className='w-[40px] text-center'>{opt.label.replace(`${selectedLevel} `, '')}</div>
            <Tag style={{borderRadius: 20}} color="purple" variant="outlined">{opt.value}</Tag>
          </div>,
        }))}
        style={{ width: 140 }}
        styles={{
          root: {
            borderRadius: ' 0 20px 20px 0',
          }
        }}
        showSearch
                    variant="filled" 
      />
    </Space.Compact>
  );
}