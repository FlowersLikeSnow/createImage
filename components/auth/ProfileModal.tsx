'use client';

import { useState, useRef, useEffect } from 'react';
import { Modal, Form, Input, Button, message, Avatar, Spin } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useAuth } from './AuthContext';
import dayjs from 'dayjs';

export function ProfileModal() {
  const { user, profileModalVisible, hideProfileModal, updateProfile, updateAvatar } = useAuth();
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 当 modal 打开或 user 变化时，同步 nickname
  useEffect(() => {
    if (profileModalVisible && user) {
      setNickname(user.nickname);
    }
  }, [profileModalVisible, user]);

  if (!user) return null;

  const handleSubmit = async () => {
    if (!nickname.trim() || nickname.trim().length < 2) {
      message.warning('昵称至少需要2个字符');
      return;
    }

    setLoading(true);
    const result = await updateProfile(nickname.trim());
    setLoading(false);

    if (result.success) {
      message.success('更新成功');
      hideProfileModal();
    } else {
      message.error(result.error || '更新失败');
    }
  };

  const handleCancel = () => {
    hideProfileModal();
    setNickname(user.nickname);
  };

  // 处理头像上传
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      message.error('仅支持 JPG、PNG、GIF、WebP 格式的图片');
      return;
    }

    // 验证文件大小 (最大 2MB)
    if (file.size > 2 * 1024 * 1024) {
      message.error('图片大小不能超过 2MB');
      return;
    }

    setAvatarLoading(true);
    const result = await updateAvatar(file);
    setAvatarLoading(false);

    if (result.success) {
      message.success('头像更新成功');
    } else {
      message.error(result.error || '头像上传失败');
    }

    // 清空 input 以便再次选择同一文件
    e.target.value = '';
  };

  return (
    <Modal
      title="个人信息"
      open={profileModalVisible}
      onCancel={handleCancel}
      footer={null}
      width={400}
    >
      <Form layout="vertical" className="mt-4">
        {/* 头像编辑 */}
        <Form.Item label="">
          <div
            className="relative cursor-pointer flex flex-col items-center justify-center"
            onClick={handleAvatarClick}
          >
              <Spin spinning={avatarLoading}>
                <Avatar
                  size={80}
                  className="bg-blue-500"
                  icon={<UserOutlined />}
                  src={user.avatar}
                >
                  {user.nickname?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                </Avatar>
              </Spin>
            <span className="text-white text-sm font-medium">点击更换头像</span>
          </div>
          {/* 隐藏的文件输入 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </Form.Item>
        <Form.Item label="邮箱">
          <Input value={user.email} disabled />
        </Form.Item>
        <Form.Item label="昵称" required>
          <Input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="请输入昵称"
          />
        </Form.Item>
        <Form.Item label="注册时间">
          <Input
            value={user.createdAt ? dayjs(user.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
            disabled
          />
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            block
            loading={loading}
            onClick={handleSubmit}
          >
            保存
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}