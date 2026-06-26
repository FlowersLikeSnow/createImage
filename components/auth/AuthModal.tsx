'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Input, Button, message, Tabs } from 'antd';
import { useAuth } from './AuthContext';
import { CaptchaInput } from './CaptchaInput';

type AuthMode = 'login' | 'register';

export function AuthModal() {
  const { loginModalVisible, hideLoginModal, login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
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
      console.error('[AuthModal] refreshCaptcha error:', error);
    }
  }, []);

  useEffect(() => {
    if (loginModalVisible) {
      refreshCaptcha();
      setForm({ email: '', password: '', nickname: '', captchaCode: '' });
    }
  }, [loginModalVisible, refreshCaptcha]);

  const handleLogin = async () => {
    if (!form.email || !form.password || !form.captchaCode) {
      message.warning('请填写完整信息');
      return;
    }

    setLoading(true);
    const result = await login(form.email, form.password, captchaId, form.captchaCode);
    setLoading(false);

    if (!result.success) {
      message.error(result.error || '登录失败');
      refreshCaptcha();
    } else {
      message.success('登录成功');
      setForm({ email: '', password: '', nickname: '', captchaCode: '' });
    }
  };

  const handleRegister = async () => {
    if (!form.email || !form.password || !form.nickname || !form.captchaCode) {
      message.warning('请填写完整信息');
      return;
    }

    setLoading(true);
    const result = await register(form.email, form.password, form.nickname, captchaId, form.captchaCode);
    setLoading(false);

    if (!result.success) {
      message.error(result.error || '注册失败');
      refreshCaptcha();
    } else {
      message.success('注册成功');
      setForm({ email: '', password: '', nickname: '', captchaCode: '' });
    }
  };

  const handleCancel = () => {
    hideLoginModal();
    setMode('login');
    setForm({ email: '', password: '', nickname: '', captchaCode: '' });
  };

  const handleTabChange = (key: string) => {
    setMode(key as AuthMode);
    setForm({ email: '', password: '', nickname: '', captchaCode: '' });
    refreshCaptcha();
  };

  const tabItems = [
    {
      key: 'login',
      label: '登录',
      children: (
        <Form layout="vertical" className="mt-4" onFinish={handleLogin}>
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
            <Button type="primary" block loading={loading} htmlType="submit">
              登录
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'register',
      label: '注册',
      children: (
        <Form layout="vertical" className="mt-4" onFinish={handleRegister}>
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
            <Button type="primary" block loading={loading} htmlType="submit">
              注册
            </Button>
          </Form.Item>
        </Form>
      ),
    },
  ];

  return (
    <Modal
      title={null}
      open={loginModalVisible}
      onCancel={handleCancel}
      footer={null}
      width="calc(100% - 32px)"
      style={{ maxWidth: 400 }}
    >
      {/* Logo */}
      <div className="flex justify-center mb-4">
        <img src="/logo-128.png" alt="AI生图助手" className="w-[48px] h-[48px]" />
      </div>
      <Tabs
        activeKey={mode}
        onChange={handleTabChange}
        items={tabItems}
        centered
      />
    </Modal>
  );
}