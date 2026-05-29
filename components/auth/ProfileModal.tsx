'use client';

import { useState } from 'react';
import { Modal, Form, Input, Button, message, Spin } from 'antd';
import { useAuth } from './AuthContext';

export function ProfileModal() {
  const { user, profileModalVisible, hideProfileModal, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || '');

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

  return (
    <Modal
      title="个人信息"
      open={profileModalVisible}
      onCancel={handleCancel}
      footer={null}
      width={400}
    >
      <Form layout="vertical" className="mt-4">
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
            value={user.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}
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