'use client';

import { useState, useCallback, useEffect } from 'react';
import { Sender } from '@ant-design/x';
import { Button, Spin, Typography, Divider, Flex, Tooltip, Tag, Switch, InputNumber, Menu, message } from 'antd';
import { PaperClipOutlined } from '@ant-design/icons';
import { Sparkles } from 'lucide-react';
import { useGenerate } from '@/hooks/useGenerate';
import { useAuth } from '@/components/auth/AuthContext';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { fetchWithAuth } from '@/lib/api/client';
import type { Message } from '@/types/conversation';
import { DEFAULT_IMAGE_SIZE } from '@/lib/utils/size-config';
import { SizeSelector } from './SizeSelector';
import { ImageCard } from './ImageCard';

// 菜单路由配置
const menuItems = [
  { key: 'ai-image', label: 'AI生图' },
];

export function ChatContainer() {
  const { loading, generate, startSending, stopSending } = useGenerate();
  const { requireAuth, user } = useAuth();
  const [numImages, setNumImages] = useState(1);
  const [keepPrompt, setKeepPrompt] = useState(false);
  const [images, setImages] = useState<Message[]>([]);
  const [activeMenu, setActiveMenu] = useState('ai-image');
  const [imageSize, setImageSize] = useState(DEFAULT_IMAGE_SIZE);
  const [expandLoading, setExpandLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [loadingImages, setLoadingImages] = useState(true);

  // 加载历史图片
  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = useCallback(async () => {
    setLoadingImages(true);
    try {
      const response = await fetchWithAuth('/api/images');
      const data = await response.json();
      if (data.success) {
        setImages(data.data);
      }
    } catch (error) {
      console.error('[loadImages] error:', error);
    } finally {
      setLoadingImages(false);
    }
  }, []);

  // 发送生图请求
  const handleSend = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;
    if (!requireAuth()) return;  // 未登录则弹出登录弹窗

    // 立即添加占位卡片（loading状态）
    const pendingCards: Message[] = [];
    const tempIds: string[] = [];
    for (let i = 0; i < numImages; i++) {
      const tempId = `temp-${Date.now()}-${i}`;
      tempIds.push(tempId);
      pendingCards.push({
        id: tempId,
        userId: user?.id || '',
        conversationId: 'pending',
        role: 'assistant',
        content: prompt.trim(),
        status: 'processing',
        createdAt: Date.now() + i,
      });
    }
    setImages(prev => [...pendingCards, ...prev]);
    if (!keepPrompt) {
      setInputValue('');
    }

    // 发送按钮立即停止 loading
    startSending();
    stopSending();

    // 调用生图API（异步执行，不阻塞）
    generate({
      prompt: prompt.trim(),
      imageSize,
      numImages,
    }).then(result => {
      if (result) {
        // 更新图片列表：移除占位卡片，添加真实的图片
        setImages(prev => {
          const filtered = prev.filter(m => !tempIds.includes(m.id));

          // 添加成功的图片
          const successImages: Message[] = result.images.map((img, idx) => ({
            id: img.messageId,
            userId: user?.id || '',
            conversationId: result.conversationId,
            role: 'assistant',
            content: img.prompt,
            generatedImages: [{ url: img.url, id: img.id }],
            status: 'completed',
            createdAt: Date.now() - result.images.length + idx,
          }));

          // 添加失败的图片
          const failedImages: Message[] = result.errors.map((err, idx) => ({
            id: err.messageId,
            userId: user?.id || '',
            conversationId: result.conversationId,
            role: 'assistant',
            content: prompt.trim(),
            status: 'failed',
            error: err.error,
            createdAt: Date.now() - result.images.length - result.errors.length + idx,
          }));

          return [...successImages, ...failedImages, ...filtered];
        });
      } else {
        // 所有请求失败，更新占位卡片状态
        setImages(prev => prev.map(m =>
          tempIds.includes(m.id) ? { ...m, status: 'failed', error: '生图失败' } : m
        ));
      }
    });
  }, [imageSize, numImages, keepPrompt, generate, startSending, stopSending, requireAuth, user]);

  // 扩写提示词
  const handleExpand = useCallback(async () => {
    if (!inputValue.trim()) return;
    if (!requireAuth()) return;  // 未登录则弹出登录弹窗
    setExpandLoading(true);
    try {
      const response = await fetchWithAuth('/api/prompt/expand', {
        method: 'POST',
        body: JSON.stringify({ prompt: `${inputValue.trim()}` }),
      });
      const data = await response.json();
      if (data.success) {
        setInputValue(data.data.expandedPrompt);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('扩写失败:', error);
      message.error('扩写失败');
    } finally {
      setExpandLoading(false);
    }
  }, [inputValue, requireAuth]);

  // 删除图片
  const handleDelete = useCallback(async (imageId: string) => {
    try {
      const response = await fetchWithAuth(`/api/images/${imageId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setImages(prev => prev.filter(m => m.id !== imageId));
        message.success('删除成功');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败');
    }
  }, []);

  // 下载图片
  const handleDownload = useCallback(async (imageUrl: string) => {
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
      console.error('下载失败:', error);
      message.error('下载失败');
    }
  }, []);

  return (
    <div className="flex h-screen">
      {/* 左侧菜单列表 */}
      <div className="w-[160px] bg-[#F3F5F7] flex flex-col">
        <Menu
          mode="inline"
          selectedKeys={[activeMenu]}
          onClick={(e) => setActiveMenu(e.key)}
          items={menuItems}
          style={{ border: 'none', background: '#F3F5F7' }}
          className="compact-menu"
        />
      </div>

      {/* 主区域 */}
      <div className="flex-1 flex flex-col bg-gray-100 p-[20px]">
        {/* 顶部标题栏 */}
        <div className="bg-gray-800 text-white px-6 py-3 flex justify-between items-center">
          <Typography.Title level={4} className="!text-white !mb-0">
            AI生图
          </Typography.Title>
          <UserAvatar />
        </div>

        {/* 消息区域 - 图片卡片列表 */}
        <div className="flex-1 overflow-y-auto py-[20px]">
          {loadingImages ? (
            <div className="flex items-center justify-center h-full">
              <Spin description="加载历史图片..." />
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Typography.Text className="text-lg">输入提示词开始生成图片</Typography.Text>
              <Typography.Text className="text-sm mt-2">支持扩写提示词、选择尺寸比例</Typography.Text>
            </div>
          ) : (
            <div className="flex flex-wrap gap-[20px]">
              {images.map(img => (
                <ImageCard
                  key={img.id}
                  img={img}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>

        {/* 输入区域 */}
        <div className="bg-white p-4">
          <div className="mx-auto max-w-[1280px] flex gap-2">
            <Sender
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleSend}
              loading={loading}
              disabled={expandLoading}
              placeholder="输入提示词描述你想要生成的图片..."
              suffix={false}
              autoSize={{ minRows: 4, maxRows: 8 }}
              footer={(_, info) => {
                const { SendButton, SpeechButton } = info.components;
                return <Flex justify="space-between" align="center">
                  <Flex gap="small" align="center">
                    <Tooltip title="仅图片上传,图片大小限制5MB">
                      <Button shape='circle' type="text" icon={<PaperClipOutlined />} />
                    </Tooltip>
                    <Button
                      color={expandLoading ? 'purple' : 'default'}
                      variant="filled" shape='round' loading={expandLoading} 
                      icon={<Sparkles size={12} />} onClick={handleExpand}>
                      扩写
                    </Button>
                    <SizeSelector value={imageSize} onChange={setImageSize} />
                    <label className="cursor-pointer select-none">
                      <Tag style={{
                        borderRadius: 20,
                        height: 30,
                        display: 'flex',
                        alignItems: 'center',
                      }} color={keepPrompt ? 'purple' : '#666'} variant="filled">
                        <Switch checked={keepPrompt} onChange={setKeepPrompt} />
                        <div className='ml-[5px]'>保留提示词</div>
                      </Tag>
                    </label>
                  </Flex>
                  <Flex align="center">
                    <Tooltip title={`语音输入提示词,需要给予麦克风权限`}>
                    <SpeechButton shape='round' />
                    </Tooltip>
                    <Divider orientation="vertical" />
                    <Tooltip title={`生成${numImages}张图片,最多10张`}>
                      <InputNumber
                        mode="spinner"
                        value={numImages}
                        onChange={(value) => setNumImages(value || 1)}
                        controls
                        placeholder="数量"
                        variant="filled"
                        min={1}
                        step={1}
                        max={10}
                        style={{ width: 120 }}
                        styles={{
                          input: {
                            textAlign: 'center'
                          }
                        }}
                      />
                    </Tooltip>
                    <Divider orientation="vertical" />
                    <SendButton disabled={inputValue.trim() === '' || expandLoading || loading} />
                  </Flex>
                </Flex>;
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}