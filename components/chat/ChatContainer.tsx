'use client';

import { useState, useCallback } from 'react';
import { Sender, Bubble } from '@ant-design/x';
import { Button, Image, Spin, Space, Typography, Divider, Flex, Tooltip, Tag, Switch, InputNumber, Menu } from 'antd';
import { PlusOutlined, DownloadOutlined, ReloadOutlined, AntDesignOutlined, ApiOutlined, OpenAIOutlined, PaperClipOutlined, ProfileOutlined } from '@ant-design/icons';
import { useGenerate } from '@/hooks/useGenerate';
import type { Message, Conversation } from '@/types/conversation';
import { DEFAULT_IMAGE_SIZE } from '@/lib/utils/size-config';
import { SizeSelector } from './SizeSelector';

// 模拟对话数据
const mockConversations: Conversation[] = [
  { id: '1', title: '海边阳光女孩', messages: [], createdAt: Date.now() - 100000, updatedAt: Date.now() - 100000 },
  { id: '2', title: '城市夜景照片', messages: [], createdAt: Date.now() - 200000, updatedAt: Date.now() - 200000 },
  { id: '3', title: '产品展示图', messages: [], createdAt: Date.now() - 300000, updatedAt: Date.now() - 300000 },
];

export function ChatContainer() {
  const { loading, generate } = useGenerate();
  const [numImages, setNumImages] = useState(1);
  const [keepPrompt, setKeepPrompt] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState(DEFAULT_IMAGE_SIZE);
  const [expandLoading, setExpandLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // 发送生图请求
  const handleSend = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;

    // 添加用户消息
    const userMsg: Message = {
      id: `temp-user-${Date.now()}`,
      conversationId: activeConversation || 'new',
      role: 'user',
      content: prompt.trim(),
      imageSize,
      status: 'pending',
      createdAt: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');

    // 调用生图API
    const result = await generate({
      prompt: prompt.trim(),
      imageSize,
      conversationId: activeConversation || undefined,
    });

    if (result) {
      const aiMsg: Message = {
        id: result.messageId,
        conversationId: result.conversationId,
        role: 'assistant',
        content: result.revisedPrompt || prompt.trim(),
        generatedImages: result.images,
        status: 'completed',
        createdAt: Date.now(),
      };
      setMessages(prev => [...prev, aiMsg]);
      setActiveConversation(result.conversationId);
    } else {
      setMessages(prev => prev.map(m =>
        m.id === userMsg.id ? { ...m, status: 'failed', error: '生图失败' } : m
      ));
    }
  }, [activeConversation, imageSize, generate]);

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
    } finally {
      setExpandLoading(false);
    }
  }, [inputValue]);

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
    }
  }, []);

  // 重新生成
  const handleRegenerate = useCallback(() => {
    const lastUserMsg = messages.filter(m => m.role === 'user').pop();
    if (lastUserMsg && lastUserMsg.content) {
      handleSend(lastUserMsg.content);
    }
  }, [messages, handleSend]);

  // 新建对话
  const handleNewConversation = useCallback(() => {
    setMessages([]);
    setActiveConversation(null);
    setInputValue('');
  }, []);

  // 选择对话
  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversation(id);
    // 模拟加载历史消息
    setMessages([
      { id: 'm1', conversationId: id, role: 'user', content: '生成一张海边阳光女孩的照片', imageSize: '1024x1024', status: 'completed', createdAt: Date.now() - 10000 },
      { id: 'm2', conversationId: id, role: 'assistant', generatedImages: [{ url: 'https://picsum.photos/400/400?random=1', id: 'img1' }], status: 'completed', createdAt: Date.now() - 9000 },
    ]);
  }, []);

  // 渲染消息气泡
  const renderMessage = (msg: Message) => {
    if (msg.role === 'user') {
      return (
        <Bubble
          key={msg.id}
          placement="end"
          content={
            <div>
              <Typography.Text>{msg.content}</Typography.Text>
              {msg.imageSize && (
                <Typography.Text type="secondary" className="block mt-1 text-xs">
                  尺寸: {msg.imageSize}
                </Typography.Text>
              )}
            </div>
          }
          styles={{ content: { backgroundColor: '#1890ff', color: '#fff', borderRadius: 12 } }}
        />
      );
    }

    return (
      <Bubble
        key={msg.id}
        placement="start"
        content={
          loading && !msg.generatedImages ? (
            <Spin description="正在生成图片..." />
          ) : msg.generatedImages ? (
            <div className="space-y-2">
              <Image.PreviewGroup>
                {msg.generatedImages.map((img) => (
                  <Image
                    key={img.id}
                    src={img.url}
                    width={300}
                    className="rounded-lg"
                  />
                ))}
              </Image.PreviewGroup>
              <Space>
                <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(msg.generatedImages![0].url)}>
                  下载
                </Button>
                <Button size="small" icon={<ReloadOutlined />} onClick={handleRegenerate}>
                  重新生成
                </Button>
              </Space>
            </div>
          ) : (
            <Typography.Text type="danger">{msg.error || '生成失败'}</Typography.Text>
          )
        }
        styles={{ content: { backgroundColor: '#F3F5F7', borderRadius: 12, padding: 16 } }}
      />
    );
  };

  // 对话列表配置
  const conversationsItems = mockConversations.map(conv => ({
    key: conv.id,
    label: conv.title,
  }));

  return (
    <div className="flex h-screen">
      {/* 左侧对话列表 */}
      <div className="w-[160px] bg-[#F3F5F7] flex flex-col">
        <Menu
          mode="inline"
          selectedKeys={[activeConversation || '']}
          onClick={(e) => handleSelectConversation(e.key as string)}
          items={conversationsItems}
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

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Typography.Text className="text-lg">输入提示词开始生成图片</Typography.Text>
              <Typography.Text className="text-sm mt-2">支持扩写提示词、选择尺寸比例</Typography.Text>
            </div>
          ) : (
            <div className="space-y-4 max-w-[800px] mx-auto">
              {messages.map(renderMessage)}
            </div>
          )}
        </div>

        {/* 输入区域 */}
        <div className="bg-white p-4">
          <div className="mx-auto max-w-[800px] flex gap-2">
            <Sender
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleSend}
              loading={loading}
              placeholder="输入提示词描述你想要生成的图片..."
              suffix={false}
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