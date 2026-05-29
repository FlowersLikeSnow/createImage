'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { useAuth } from './AuthContext';
import { CaptchaInput } from './CaptchaInput';

interface RegisterModalProps {
  onSwitchToLogin: () => void;
}

export function RegisterModal({ onSwitchToLogin }: RegisterModalProps) {
  const { register } = useAuth();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaId, setCaptchaId] = useState<string>('');
  const [captchaImage, setCaptchaImage] = useState<string>('');
  const [form, setForm] = useState({
    email: '',
    password: '',
    nickname: '',
    captchaCode: '',
  });

  const refreshCaptcha = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/captcha');
      const data = await response.json();
      if (data.success) {
        setCaptchaId(data.data.captchaId);
        setCaptchaImage(data.data.captchaImage);
      }
    } catch (error) {
      console.error('[RegisterModal] refreshCaptcha error:', error);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      refreshCaptcha();
    }
  }, [visible, refreshCaptcha]);

  const handleSubmit = async () => {
    if (!form.email || !form.password || !form.nickname || !form.captchaCode) {
      message.warning('请填写完整信息');
      return;
    }

    setLoading(true);
    const result = await register(
      form.email,
      form.password,
      form.nickname,
      captchaId!,
      form.captchaCode
    );
    setLoading(false);

    if (!result.success) {
      message.error(result.error || '注册失败');
      refreshCaptcha();
    } else {
      message.success('注册成功');
      setForm({ email: '', password: '', nickname: '', captchaCode: '' });
      setVisible(false);
    }
  };

  const handleCancel = () => {
    setVisible(false);
    setForm({ email: '', password: '', nickname: '', captchaCode: '' });
  };

  const show = () => setVisible(true);

  return (
    <Modal
      title="注册"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={400}
      destroyOnHidden
    >
      <Form layout="vertical" className="mt-4">
        <Form.Item label="邮箱" required>
          <Input
            placeholder="请输入邮箱"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Form.Item>
        <Form.Item label="昵称" required>
          <Input
            placeholder="请输入昵称（至少2个字符）"
            value={form.nickname}
            onChange={(e) => setForm({ ...form, nickname: e.target.value })}
          />
        </Form.Item>
        <Form.Item label="密码" required>
          <Input.Password
            placeholder="至少8位，需包含字母和数字"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </Form.Item>
        <Form.Item label="验证码" required>
          <CaptchaInput
            value={form.captchaCode}
            onChange={(v) => setForm({ ...form, captchaCode: v })}
            captchaImage={captchaImage}
            onRefresh={refreshCaptcha}
          />
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            block
            loading={loading}
            onClick={handleSubmit}
          >
            注册
          </Button>
        </Form.Item>
        <div className="text-center">
          <Button type="link" onClick={onSwitchToLogin}>
            已有账号？立即登录
          </Button>
        </div>
      </Form>
    </Modal>
  );
}

export function useRegisterModal() {
  const [visible, setVisible] = useState(false);

  return {
    visible,
    show: () => setVisible(true),
    hide: () => setVisible(false),
  };
}