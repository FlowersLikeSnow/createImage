'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Attachments, AttachmentsProps, Sender } from '@ant-design/x';
import { Button, Spin, Typography, Divider, Flex, Tooltip, Tag, Switch, InputNumber, Menu, message, Card, GetRef, GetProp, Alert, Modal } from 'antd';
import { CloudUploadOutlined, PaperClipOutlined } from '@ant-design/icons';
import { Sparkles, Bot, Coins } from 'lucide-react';
import { useGenerate } from '@/hooks/useGenerate';
import { useAuth } from '@/components/auth/AuthContext';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { RedeemModal } from '@/components/redemption/RedeemModal';
import { fetchWithAuth } from '@/lib/api/client';
import type { Message } from '@/types/conversation';
import { DEFAULT_IMAGE_SIZE, getCreditBySize } from '@/lib/utils/size-config';
import { SizeSelector } from './SizeSelector';
import { ImageCard } from './ImageCard';
import React from 'react';
import Marquee from 'react-fast-marquee';

// 菜单路由配置
const menuItems = [
  { key: 'ai-image', label: 'AI生图' },
  { key: 'contact', label: '联系客服' },
];

export function ChatContainer() {
  const { loading, generate, startSending, stopSending } = useGenerate();
  const { requireAuth, user, refreshUser } = useAuth();
  const [images, setImages] = useState<Message[]>([]);
  const [activeMenu, setActiveMenu] = useState('ai-image');
  const [numImages, setNumImages] = useState(1);
  const [keepPrompt, setKeepPrompt] = useState(false);
  const [imageSize, setImageSize] = useState(DEFAULT_IMAGE_SIZE);
  const [expandLoading, setExpandLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [loadingImages, setLoadingImages] = useState(true);
  const [redeemModalVisible, setRedeemModalVisible] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false); // 客服弹窗状态

  // 计算所需积分
  const requiredCredits = getCreditBySize(imageSize) * numImages;
  const userCredits = user?.credits ?? 0;
  const hasEnoughCredits = userCredits >= requiredCredits;
  const isSendDisabled = inputValue.trim() === '' || expandLoading || loading || !hasEnoughCredits;

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

  // 监听用户状态变化，自动加载或清空图片列表
  useEffect(() => {
    if (!user) {
      // 未登录：清空图片列表
      setImages([]);
      setLoadingImages(false);
    } else {
      // 已登录：加载该用户的图片
      loadImages();
    }
  }, [user, loadImages]);

  // 发送生图请求
  const handleSend = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;
    if (!requireAuth()) return;  // 未登录则弹出登录弹窗

    // 获取选择的参考图片文件
    const referenceImageFile = items.length > 0 && items[0].originFileObj ? items[0].originFileObj : undefined;

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
      setItems([]);
      setOpen(false);
    }

    // 发送按钮立即停止 loading
    startSending();
    stopSending();

    // 调用生图API（异步执行，不阻塞）
    generate({
      prompt: prompt.trim(),
      imageSize,
      numImages,
      referenceImage: referenceImageFile,
    }).then(result => {
      if (result?.error) {
        // 检查是否是积分不足
        if (result.error.isCreditInsufficient) {
          // 积分不足：移除占位卡片，显示 message 提示
          setImages(prev => prev.filter(m => !tempIds.includes(m.id)));
          message.error(result.error.error);
          refreshUser(); // 刷新用户信息（积分可能已更新）
        } else {
          // 其他错误：保留占位卡片，标记为失败
          setImages(prev => prev.map(m =>
            tempIds.includes(m.id) ? { ...m, status: 'failed', error: result.error!.error } : m
          ));
        }
      } else if (result?.data) {
        // 更新图片列表：移除占位卡片，添加真实的图片
        setImages(prev => {
          const filtered = prev.filter(m => !tempIds.includes(m.id));

          // 添加成功的图片
          const successImages: Message[] = result.data!.images.map((img, idx) => ({
            id: img.messageId,
            userId: user?.id || '',
            conversationId: result.data!.conversationId,
            role: 'assistant',
            content: img.prompt,
            generatedImages: [{ url: img.url, id: img.id }],
            status: 'completed',
            createdAt: Date.now() - result.data!.images.length + idx,
          }));

          // 添加失败的图片
          const failedImages: Message[] = result.data!.errors.map((err, idx) => ({
            id: err.messageId,
            userId: user?.id || '',
            conversationId: result.data!.conversationId,
            role: 'assistant',
            content: prompt.trim(),
            status: 'failed',
            error: err.error,
            createdAt: Date.now() - result.data!.images.length - result.data!.errors.length + idx,
          }));

          return [...successImages, ...failedImages, ...filtered];
        });

        // 刷新用户信息（积分已扣除）
        refreshUser();
      } else {
        // 请求完全失败（网络错误等）
        setImages(prev => prev.map(m =>
          tempIds.includes(m.id) ? { ...m, status: 'failed', error: '生图失败，请重试' } : m
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

  // 兑换成功后刷新用户信息
  const handleRedeemSuccess = useCallback(async (credits: number, totalCredits: number) => {
    message.success(`成功兑换 ${credits} 积分，当前总积分: ${totalCredits.toFixed(2)}`);
    // 立即刷新用户数据
    await refreshUser();
  }, [refreshUser]);

  // 打开兑换弹窗
  const handleOpenRedeem = useCallback(() => {
    if (!requireAuth()) return;
    setRedeemModalVisible(true);
  }, [requireAuth]);

  const [open, setOpen] = useState(false);
  const senderRef = React.useRef<GetRef<typeof Sender>>(null);
  const attachmentsRef = useRef<GetRef<typeof Attachments>>(null);
  const [items, setItems] = useState<GetProp<AttachmentsProps, 'items'>>([]);
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
        items={items}
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
          setItems(validFiles);
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


  return (
    <div className="flex h-screen">
      {/* 左侧菜单列表 */}
      <div className="w-[160px] bg-[#F3F5F7] flex flex-col">
        {/* 顶部 AI 标识 */}
        <div className="px-[10px] py-[6px] border-gray-200">
          <Flex align="center" gap="small">
            <img src="/logo-64.png" alt="AI生图助手" className='w-[24px] h-[24px] rounded-[8px] shadow-md shrink-0' />
            <Typography.Text className="text-sm font-medium">GPT-Image-2</Typography.Text>
          </Flex>
        </div>

        {/* 菜单 */}
        <Menu
          mode="inline"
          selectedKeys={[activeMenu]}
          onClick={(e) => {
            if (e.key === 'contact') {
              setContactModalVisible(true);
            } else {
              setActiveMenu(e.key);
            }
          }}
          items={menuItems}
          style={{ border: 'none', background: '#F3F5F7' }}
          className="compact-menu"
        />

        {/* 底部状态面板 */}
        <div className="mt-auto p-[10px] py-[6px] border-gray-200 bg-white">
          <Card size="small" className="bg-gray-50">
            <div className="space-y-3">
              {/* 进行中任务 */}
              <Flex justify="space-between" align="center">
                <div className="text-[12px] text-[#666] font-[500]">进行中任务</div>
                <div className="text-[12px] text-gray-500">
                  <span className="font-medium">{images.filter(i => i.status === 'processing').length}</span>
                </div>
              </Flex>
              {/* 剩余积分 */}
              <Flex justify="space-between" align="center">
                <div className="text-[12px] text-[#666] font-[500]">剩余积分</div>
                <div className="text-[12px] font-medium text-orange-500">
                  {user?.credits?.toFixed(2) || '0.00'}
                </div>
              </Flex>
              <Flex justify="center" align="center" gap="small">
                <Button size="small" shape="round" color='geekblue' variant="filled"
                  style={{ fontSize: 12 }}
                  icon={<Coins size={12} color='#531dab' strokeWidth={1} />}
                  onClick={handleOpenRedeem}>
                  兑换
                </Button>
                <Tooltip title="暂未开放">
                  <Button size="small" shape="round" color='orange' variant="filled"
                    style={{ fontSize: 12 }}
                    disabled
                    icon={<Sparkles size={12} color='#531dab' strokeWidth={1} />}>
                    充值
                </Button>
                </Tooltip>
              </Flex>
            </div>
          </Card>
        </div>
      </div>

      {/* 主区域 */}
      <div className="flex-1 flex flex-col bg-gray-100 p-[20px]">
        {/* 顶部标题栏 */}
        <div className="bg-gray-800 text-white px-6 py-3 flex justify-between items-center">
          <Typography.Title level={4} className="!text-white !mb-0 mt-[5px] whitespace-nowrap">
            AI生图
          </Typography.Title>
          <div className='flex-auto h-full px-[20px]'>
              <Alert
                banner
                title={
                  <Marquee pauseOnHover gradient={false}>
                    ✨ AI生图助手 - 智能图片生成平台 | 支持多种尺寸、并发生成 | 💰 充值兑换在左下角「积分」按钮
                  </Marquee>
                }
              />
          </div>
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
              <div className='p-[13px] rounded-[50%] bg-[#F6F7F9]  flex items-center justify-center mb-[10px]'>
                <Sparkles size={30} color='#C9CBCD' />
              </div>
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
              ref={senderRef}
              header={senderHeader}
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
                    <Tooltip title={items?.length > 0 ? '已上传参考图片' : '上传参考图片'}>
                      <Button shape='circle' color='purple' variant={items?.length > 0 ? 'filled' : 'text'} icon={<PaperClipOutlined />} onClick={() => setOpen(!open)} />
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
                      <SpeechButton shape='round' color='purple' />
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
                </Flex>;
              }}
            />
          </div>
        </div>
      </div>

      {/* 兑换弹窗 */}
      <RedeemModal
        visible={redeemModalVisible}
        onClose={() => setRedeemModalVisible(false)}
        onSuccess={handleRedeemSuccess}
      />

      {/* 联系客服弹窗 */}
      <Modal
        title="联系客服"
        open={contactModalVisible}
        onCancel={() => setContactModalVisible(false)}
        footer={null}
        centered
      >
        <div className="flex flex-col items-center">
          <img
            src="http://love.img.lijundong.cn/site/wx.png"
            alt="客服微信"
            className="w-[300px] h-[300px]"
          />
          <Typography.Text className="text-[#666] mt-[16px]">
            扫描二维码添加客服微信
          </Typography.Text>
        </div>
      </Modal>
    </div>
  );
}