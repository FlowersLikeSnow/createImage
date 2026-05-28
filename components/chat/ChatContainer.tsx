'use client';

import { useState, useCallback, useEffect } from 'react';
import { Sender } from '@ant-design/x';
import { Button, Image, Spin, Typography, Divider, Flex, Tooltip, Tag, Switch, InputNumber, Menu, Card, Empty, Popconfirm, message } from 'antd';
import { DownloadOutlined, OpenAIOutlined, PaperClipOutlined, DeleteOutlined } from '@ant-design/icons';
import { useGenerate } from '@/hooks/useGenerate';
import type { Message } from '@/types/conversation';
import { DEFAULT_IMAGE_SIZE } from '@/lib/utils/size-config';
import { SizeSelector } from './SizeSelector';

// 菜单路由配置
const menuItems = [
  { key: 'ai-image', label: 'AI生图' },
];

export function ChatContainer() {
  const { loading, generate, startSending, stopSending } = useGenerate();
  const [numImages, setNumImages] = useState(1);
  const [keepPrompt, setKeepPrompt] = useState(true);
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
      const response = await fetch('/api/images');
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

    // 立即添加占位卡片（loading状态）
    const pendingCards: Message[] = [];
    const tempIds: string[] = [];
    for (let i = 0; i < numImages; i++) {
      const tempId = `temp-${Date.now()}-${i}`;
      tempIds.push(tempId);
      pendingCards.push({
        id: tempId,
        conversationId: 'pending',
        role: 'assistant',
        content: prompt.trim(),
        status: 'processing',
        createdAt: Date.now() + i,
      });
    }
    setImages(prev => [...pendingCards, ...prev]);
    setInputValue('');

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
  }, [imageSize, numImages, generate, startSending, stopSending]);

  // 扩写提示词
  const handleExpand = useCallback(async () => {
    if (!inputValue.trim()) return;
    setExpandLoading(true);
    try {
      const response = await fetch('/api/prompt/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: inputValue.trim() }),
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
  }, [inputValue]);

  // 删除图片
  const handleDelete = useCallback(async (imageId: string) => {
    try {
      const response = await fetch(`/api/images/${imageId}`, {
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

  // 渲染图片卡片
  const renderImageCard = (img: Message) => {
    const isProcessing = img.status === 'processing';
    const isFailed = img.status === 'failed';
    const hasImage = img.generatedImages && img.generatedImages.length > 0;

    return (
      <Card
        key={img.id}
        className="w-[280px] shadow-sm"
        cover={
          isProcessing ? (
            <div className="h-[180px] flex items-center justify-center bg-gray-50">
              <Spin description="正在生成..." />
            </div>
          ) : isFailed ? (
            <div className="h-[180px] flex items-center justify-center bg-gray-50">
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
                <DownloadOutlined onClick={() => handleDownload(img.generatedImages![0].url)} />
              </Tooltip>
            ),
            <Popconfirm
              title="确认删除"
              description="删除后无法恢复"
              onConfirm={() => handleDelete(img.id)}
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
              ellipsis={{ rows: 2, expandable: true }}
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
  };

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
        <div className="bg-gray-800 text-white px-6 py-3">
          <Typography.Title level={4} className="!text-white !mb-0">
            AI生图
          </Typography.Title>
        </div>

        {/* 消息区域 - 图片卡片列表 */}
        <div className="flex-1 overflow-y-auto p-4">
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
            <div className="flex flex-wrap gap-4">
              {images.map(renderImageCard)}
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
              placeholder="输入提示词描述你想要生成的图片..."
              suffix={false}
              autoSize={{ minRows: 4, maxRows: 8 }}
              footer={(actionNode) => {
                return <Flex justify="space-between" align="center">
                  <Flex gap="small" align="center">
                    <Tooltip title="仅图片上传,图片大小限制5MB">
                      <Button shape='circle' type="text" icon={<PaperClipOutlined />} />
                    </Tooltip>
                    <Button
                      color="default"
                      variant="filled" shape='round' loading={expandLoading} icon={<OpenAIOutlined />} onClick={handleExpand}>
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
                    {actionNode}
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