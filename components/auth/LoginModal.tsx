'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { useAuth } from './AuthContext';
import { CaptchaInput } from './CaptchaInput';

interface LoginModalProps {
  onSwitchToRegister: () => void;
}

export function LoginModal({ onSwitchToRegister }: LoginModalProps) {
  const { loginModalVisible, hideLoginModal, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [captchaId, setCaptchaId] = useState<string>('');
  const [captchaImage, setCaptchaImage] = useState<string>('');
  const [form, setForm] = useState({ email: '', password: '', captchaCode: '' });

  const refreshCaptcha = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/captcha');
      const data = await response.json();
      if (data.success) {
        setCaptchaId(data.data.captchaId);
        setCaptchaImage(data.data.captchaImage);
      }
    } catch (error) {
      console.error('[LoginModal] refreshCaptcha error:', error);
    }
  }, []);

  useEffect(() => {
    if (loginModalVisible) {
      refreshCaptcha();
    }
  }, [loginModalVisible, refreshCaptcha]);

  const handleSubmit = async () => {
    if (!form.email || !form.password || !form.captchaCode) {
      message.warning('请填写完整信息');
      return;
    }

    setLoading(true);
    const result = await login(form.email, form.password, captchaId!, form.captchaCode);
    setLoading(false);

    if (!result.success) {
      message.error(result.error || '登录失败');
      refreshCaptcha();
    } else {
      message.success('登录成功');
      setForm({ email: '', password: '', captchaCode: '' });
    }
  };

  const handleCancel = () => {
    hideLoginModal();
    setForm({ email: '', password: '', captchaCode: '' });
  };

  return (
    <Modal
      title="登录"
      open={loginModalVisible}
      onCancel={handleCancel}
      footer={null}
      width={400}
    >
      <Form layout="vertical" className="mt-4">
        <Form.Item label="邮箱" required>
          <Input
            placeholder="请输入邮箱"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Form.Item>
        <Form.Item label="密码" required>
          <Input.Password
            placeholder="请输入密码"
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
            登录
          </Button>
        </Form.Item>
        <div className="text-center">
          <Button type="link" onClick={onSwitchToRegister}>
            没有账号？立即注册
          </Button>
        </div>
      </Form>
    </Modal>
  );
}