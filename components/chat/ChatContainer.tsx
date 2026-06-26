'use client';

import { useState, useCallback, useEffect } from 'react';
import { Drawer, message, GetProp } from 'antd';
import { AttachmentsProps } from '@ant-design/x';
import { useGenerate } from '@/hooks/useGenerate';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAuth } from '@/components/auth/AuthContext';
import { RedeemModal } from '@/components/redemption/RedeemModal';
import { fetchWithAuth } from '@/lib/api/client';
import type { Message } from '@/types/conversation';
import { DEFAULT_IMAGE_SIZE, getCreditBySize } from '@/lib/utils/size-config';
import { ContactModal } from './ContactModal';
import { ImageDetailsModal } from './ImageDetailsModal';
import { ChatSidebar } from './components/ChatSidebar';
import { ChatTopBar } from './components/ChatTopBar';
import { ChatImageGrid } from './components/ChatImageGrid';
import { ChatInputArea } from './components/ChatInputArea';

export function ChatContainer() {
  const { loading, generate, startSending, stopSending } = useGenerate();
  const { requireAuth, user, refreshUser } = useAuth();
  const { isMobile, isTablet, isDesktop } = useBreakpoint();
  const [images, setImages] = useState<Message[]>([]);
  const [activeMenu, setActiveMenu] = useState('ai-image');
  const [numImages, setNumImages] = useState(1);
  const [keepPrompt, setKeepPrompt] = useState(false);
  const [imageSize, setImageSize] = useState(DEFAULT_IMAGE_SIZE);
  const [expandLoading, setExpandLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [loadingImages, setLoadingImages] = useState(true);
  const [redeemModalVisible, setRedeemModalVisible] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [items, setItems] = useState<GetProp<AttachmentsProps, 'items'>>([]);
  const [detailsImage, setDetailsImage] = useState<Message | null>(null);

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
      setImages([]);
      setLoadingImages(false);
    } else {
      loadImages();
    }
  }, [user, loadImages]);

  // 发送生图请求
  const handleSend = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;
    if (!requireAuth()) return;

    const referenceImageFile = items.length > 0 && items[0].originFileObj ? items[0].originFileObj : undefined;

    // 立即添加占位卡片
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
    }

    startSending();
    stopSending();

    generate({
      prompt: prompt.trim(),
      imageSize,
      numImages,
      referenceImage: referenceImageFile,
    }).then(result => {
      if (result?.error) {
        if (result.error.isCreditInsufficient) {
          setImages(prev => prev.filter(m => !tempIds.includes(m.id)));
          message.error(result.error.error);
          refreshUser();
        } else {
          setImages(prev => prev.map(m =>
            tempIds.includes(m.id) ? { ...m, status: 'failed', error: result.error!.error } : m
          ));
        }
      } else if (result?.data) {
        setImages(prev => {
          const filtered = prev.filter(m => !tempIds.includes(m.id));
          const successImages: Message[] = result.data!.images.map((img, idx) => ({
            id: img.messageId,
            userId: user?.id || '',
            conversationId: result.data!.conversationId,
            role: 'assistant',
            content: img.prompt,
            image: { url: img.url, id: img.id },
            status: 'completed',
            createdAt: Date.now() - result.data!.images.length + idx,
          }));
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
        refreshUser();
      } else {
        setImages(prev => prev.map(m =>
          tempIds.includes(m.id) ? { ...m, status: 'failed', error: '生图失败，请重试' } : m
        ));
      }
    });
  }, [imageSize, numImages, keepPrompt, generate, startSending, stopSending, requireAuth, user, items]);

  // 扩写提示词
  const handleExpand = useCallback(async () => {
    if (!inputValue.trim()) return;
    if (!requireAuth()) return;
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

  // 查看图片详情
  const handleDetails = useCallback((msg: Message) => {
    setDetailsImage(msg);
  }, []);

  // 兑换成功后刷新用户信息
  const handleRedeemSuccess = useCallback(async (credits: number, totalCredits: number) => {
    message.success(`成功兑换 ${credits} 积分，当前总积分: ${totalCredits.toFixed(2)}`);
    await refreshUser();
  }, [refreshUser]);

  // 打开兑换弹窗
  const handleOpenRedeem = useCallback(() => {
    if (!requireAuth()) return;
    setRedeemModalVisible(true);
  }, [requireAuth]);

  return (
    <div className="flex h-screen">
      {/* 桌面端侧边栏 */}
      {isDesktop && (
        <div className="w-[160px] bg-[#F8F9FA] flex flex-col shrink-0">
          <ChatSidebar
            activeMenu={activeMenu}
            onMenuClick={setActiveMenu}
            onContactClick={() => setContactModalVisible(true)}
            onRedeemClick={handleOpenRedeem}
            processingCount={images.filter(i => i.status === 'processing').length}
            userCredits={user?.credits ?? 0}
            showLogo={true}
            isMobile={false}
          />
        </div>
      )}

      {/* 移动端/平板端抽屉 */}
      {!isDesktop && (
        <Drawer
          placement="left"
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          closable={{ placement: 'end' }}
          title={
            <div className="flex items-center gap-2">
              <img src="/logo-64.png" alt="AI生图助手" className='w-[24px] h-[24px] rounded-[8px] shadow-md shrink-0' />
              <span className="text-sm font-medium">GPT-Image-2</span>
            </div>
          }
          styles={{
            body: { padding: 0 },
            wrapper: { width: 260 },
            header: { padding: isMobile ? '8px 12px' : '12px 16px' }
          }}
        >
          <div className="h-full flex flex-col bg-[#F8F9FA]">
            <ChatSidebar
              activeMenu={activeMenu}
              onMenuClick={(key) => {
                setActiveMenu(key);
                setSidebarOpen(false);
              }}
              onContactClick={() => {
                setContactModalVisible(true);
                setSidebarOpen(false);
              }}
              onRedeemClick={() => {
                handleOpenRedeem();
                setSidebarOpen(false);
              }}
              processingCount={images.filter(i => i.status === 'processing').length}
              userCredits={user?.credits ?? 0}
              showLogo={false}
              isMobile={isMobile}
            />
          </div>
        </Drawer>
      )}

      {/* 主区域 */}
      <div className="flex-1 flex flex-col bg-gray-100 p-[10px] md:p-[20px] relative content-main">
        {/* 顶部标题栏 */}
        <ChatTopBar
          isDesktop={isDesktop}
          isMobile={isMobile}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* 图片网格 */}
        <ChatImageGrid
          images={images}
          loadingImages={loadingImages}
          isMobile={isMobile}
          isTablet={isTablet}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onDetails={handleDetails}
        />

        {/* 输入区域 */}
        <ChatInputArea
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSend={handleSend}
          onExpand={handleExpand}
          imageSize={imageSize}
          onImageSizeChange={setImageSize}
          numImages={numImages}
          onNumImagesChange={setNumImages}
          keepPrompt={keepPrompt}
          onKeepPromptChange={setKeepPrompt}
          loading={loading}
          expandLoading={expandLoading}
          disabled={false}
          isSendDisabled={isSendDisabled}
          images={images}
          referenceImages={items}
          onReferenceImagesChange={setItems}
          isMobile={isMobile}
          isTablet={isTablet}
          isDesktop={isDesktop}
          userCredits={userCredits}
          requiredCredits={requiredCredits}
          hasEnoughCredits={hasEnoughCredits}
        />
      </div>

      {/* 兑换弹窗 */}
      <RedeemModal
        visible={redeemModalVisible}
        onClose={() => setRedeemModalVisible(false)}
        onSuccess={handleRedeemSuccess}
      />

      {/* 联系客服/充值弹窗 */}
      <ContactModal
        visible={contactModalVisible}
        onClose={() => setContactModalVisible(false)}
      />

      {/* 图片详情弹窗 */}
      <ImageDetailsModal
        visible={!!detailsImage}
        image={detailsImage}
        onClose={() => setDetailsImage(null)}
        onDownload={handleDownload}
      />
    </div>
  );
}
