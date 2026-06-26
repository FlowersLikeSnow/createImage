'use client';

import { useState, useRef, useEffect } from 'react';
import { Attachments, AttachmentsProps, Sender } from '@ant-design/x';
import { Button, Divider, Dropdown, Flex, InputNumber, message, Spin, Switch, Tag, Tooltip, GetRef, GetProp } from 'antd';
import { CloudUploadOutlined, FileImageOutlined, PaperClipOutlined } from '@ant-design/icons';
import { Sparkles } from 'lucide-react';
import type { Message } from '@/types/conversation';
import { SizeSelector } from '../SizeSelector';
import { getCreditBySize } from '@/lib/utils/size-config';

// Hydration 问题修复：检测是否在客户端
const useMounted = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
};

interface ChatInputAreaProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: (prompt: string) => void;
  onExpand: () => void;
  imageSize: string;
  onImageSizeChange: (size: string) => void;
  numImages: number;
  onNumImagesChange: (num: number) => void;
  keepPrompt: boolean;
  onKeepPromptChange: (keep: boolean) => void;
  loading: boolean;
  expandLoading: boolean;
  disabled: boolean;
  isSendDisabled: boolean;
  images: Message[];
  referenceImages: GetProp<AttachmentsProps, 'items'>;
  onReferenceImagesChange: (items: GetProp<AttachmentsProps, 'items'>) => void;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  userCredits: number;
  requiredCredits: number;
  hasEnoughCredits: boolean;
}

export function ChatInputArea({
  inputValue,
  onInputChange,
  onSend,
  onExpand,
  imageSize,
  onImageSizeChange,
  numImages,
  onNumImagesChange,
  keepPrompt,
  onKeepPromptChange,
  loading,
  expandLoading,
  disabled,
  isSendDisabled,
  images,
  referenceImages,
  onReferenceImagesChange,
  isMobile,
  isTablet,
  isDesktop,
  userCredits,
  requiredCredits,
  hasEnoughCredits,
}: ChatInputAreaProps) {
  const [open, setOpen] = useState(false);
  const senderRef = useRef<GetRef<typeof Sender>>(null);
  const attachmentsRef = useRef<GetRef<typeof Attachments>>(null);
  const mounted = useMounted();

  const senderHeader = (
    <Sender.Header
      title="参考图片上传"
      styles={{
        content: {
          padding: 0,
        },
      }}
      open={open}
      onOpenChange={setOpen}
      forceRender
    >
      <Attachments
        ref={attachmentsRef}
        maxCount={1}
        accept="image/*"
        beforeUpload={(file) => {
          // 验证文件类型
          if (!file.type.startsWith('image/')) {
            message.error('只能上传图片文件');
            return false;
          }
          // 验证文件大小 (5MB = 5 * 1024 * 1024)
          if (file.size > 5 * 1024 * 1024) {
            message.error('图片大小不能超过5MB');
            return false;
          }
          return false; // 阻止自动上传，手动处理
        }}
        items={referenceImages}
        onChange={({ fileList }) => {
          // 过滤掉不符合条件的文件
          const validFiles = fileList.filter(file => {
            if (file.type && !file.type.startsWith('image/')) {
              return false;
            }
            if (file.size && file.size > 5 * 1024 * 1024) {
              return false;
            }
            return true;
          });
          onReferenceImagesChange(validFiles);
        }}
        placeholder={() => ({
          icon: <CloudUploadOutlined />,
          title: '点击或拖动图片上传',
          description: '仅支持图片格式，大小限制5MB',
        })}
        getDropContainer={() => senderRef.current?.nativeElement}
      />
    </Sender.Header>
  );

  const imageItemClick = (item: { key: string }) => {
    senderRef.current?.insert?.(`reference image: [${item.key}]`);
  };

  return (
    <div className="bg-white p-2 md:p-4">
      <div className="mx-auto max-w-[1280px] flex gap-2">
        {!mounted ? (
          <div className="w-full h-[120px] flex items-center justify-center">
            <Spin />
          </div>
        ) : (
          <Sender
            ref={senderRef}
            header={senderHeader}
            value={inputValue}
            onChange={onInputChange}
            onSubmit={onSend}
            loading={loading}
            disabled={expandLoading}
            placeholder="输入提示词描述你想要生成的图片..."
            suffix={false}
            autoSize={{ minRows: isMobile ? 1 : 4, maxRows: 8 }}
            footer={(_, info) => {
              const { SendButton, SpeechButton } = info.components;
              // Tablet + Mobile 按钮紧凑（图标模式）
              const btnCompact = !isDesktop;
              // SizeSelector 仅在 Tablet 下收窄，Mobile 保持原始宽度
              const selectorCompact = isTablet;

              // 操作按钮行（上传、扩写、保留提示词、图片列表）
              const actionButtons = (
                <Flex gap={btnCompact ? 4 : 'small'} align="center" wrap="wrap">
                  <Tooltip title={referenceImages?.length > 0 ? '已上传参考图片' : '上传参考图片'}>
                    <Button shape='circle' color='purple' variant={referenceImages?.length > 0 ? 'filled' : 'text'} icon={<PaperClipOutlined />} onClick={() => setOpen(!open)} />
                  </Tooltip>
                  <Button
                    color={expandLoading ? 'purple' : 'default'}
                    variant="filled" shape='round' loading={expandLoading}
                    icon={<Sparkles size={12} />} onClick={onExpand}
                    size={btnCompact ? 'small' : 'middle'}
                  >
                    {btnCompact ? '' : '扩写'}
                  </Button>
                  <label className="cursor-pointer select-none">
                    <Tag style={{
                      borderRadius: 20,
                      height: btnCompact ? 24 : 30,
                      display: 'flex',
                      alignItems: 'center',
                      padding: btnCompact ? '0 6px' : undefined,
                    }} color={keepPrompt ? 'purple' : '#666'} variant="filled">
                      <Switch checked={keepPrompt} onChange={onKeepPromptChange} size={btnCompact ? 'small' : 'medium'} />
                      {!btnCompact && <div className='ml-[5px]'>保留提示词</div>}
                    </Tag>
                  </label>

                  {images?.length ? (
                    <Dropdown menu={{
                      onClick: imageItemClick, items: images.filter(img => img.image).map(img => ({
                        key: img.image?.url || img.id,
                        label: <div className='flex items-center'>
                          <img
                            src={img.image?.url || ''}
                            width={40} height={40}
                            className="rounded-[4px] object-cover mr-[5px]" />
                          {img.image?.url || ''}
                        </div>
                      }))
                    }}>
                      <Button
                        color='default'
                        variant="filled" shape='round'
                        icon={<FileImageOutlined />}
                        size={btnCompact ? 'small' : 'middle'}
                      >
                        {btnCompact ? '' : '图片列表'}
                      </Button>
                    </Dropdown>
                  ) : null}
                </Flex>
              );

              // 尺寸选择器
              const sizeSelector = (
                <SizeSelector value={imageSize} onChange={onImageSizeChange} compact={selectorCompact} />
              );

              // 核心行（Mobile 第2行 / Tablet+Desktop 右侧）
              const coreRow = (
                <Flex align="center" gap={isMobile ? 2 : 0}>
                  <Tooltip title={`语音输入提示词,需要给予麦克风权限`}>
                    <SpeechButton shape='round' color='purple' size={btnCompact ? 'small' : 'middle'} />
                  </Tooltip>
                  {!isMobile && <Divider orientation="vertical" />}
                  <Tooltip title={`生成${numImages}张图片,最多10张`}>
                    <InputNumber
                      mode="spinner"
                      value={numImages}
                      onChange={(value) => onNumImagesChange(value || 1)}
                      controls
                      placeholder=""
                      variant="filled"
                      min={1}
                      step={1}
                      max={10}
                      size={isMobile ? 'small' : 'middle'}
                      style={{ width: isMobile ? 90 : 120 }}
                      styles={{
                        input: {
                          textAlign: 'center'
                        }
                      }}
                    />
                  </Tooltip>
                  {!isMobile && <Divider orientation="vertical" />}

                  <Tooltip placement='topRight' title={
                    !hasEnoughCredits
                      ? `积分不足 (当前 ${userCredits.toFixed(2)}，需要 ${requiredCredits.toFixed(2)} 积分)`
                      : numImages === 1
                        ? `单次生成 (预估 ${getCreditBySize(imageSize).toFixed(2)} 积分)`
                        : `并发生成 ${numImages} 张 (预估 ${(getCreditBySize(imageSize) * numImages).toFixed(2)} 积分)`
                  }>
                    <SendButton disabled={isSendDisabled} />
                  </Tooltip>
                </Flex>
              );

              // Mobile: 两行布局（按钮+核心 一行 / 尺寸选择器一行）
              if (isMobile) {
                return (
                  <Flex vertical gap={4} className="w-full">
                    {sizeSelector}
                    <div className="flex justify-between w-full">
                      {actionButtons}
                      {coreRow}
                    </div>
                  </Flex>
                );
              }

              // Tablet + Desktop: 单行布局
              return <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                <Flex gap="small" align="center">
                  {actionButtons}
                  {sizeSelector}
                </Flex>
                {coreRow}
              </Flex>;
            }}
          />
        )}
      </div>
    </div>
  );
}
