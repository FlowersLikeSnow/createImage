'use client';

import { useState } from 'react';
import { AuthProvider, useAuth } from '@/components/auth/AuthContext';
import { LoginModal } from '@/components/auth/LoginModal';
import { RegisterModal } from '@/components/auth/RegisterModal';
import { ProfileModal } from '@/components/auth/ProfileModal';

interface AuthWrapperProps {
  children: React.ReactNode;
}

function AuthModals() {
  const { loginModalVisible, hideLoginModal, showLoginModal } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  // 切换到注册时，隐藏登录弹窗
  const handleSwitchToRegister = () => {
    hideLoginModal();
    setShowRegister(true);
  };

  // 切换到登录时，隐藏注册弹窗，显示登录弹窗
  const handleSwitchToLogin = () => {
    setShowRegister(false);
    showLoginModal();
  };

  return (
    <>
      <LoginModal onSwitchToRegister={handleSwitchToRegister} />
      <RegisterModal visible={showRegister} onSwitchToLogin={handleSwitchToLogin} />
      <ProfileModal />
    </>
  );
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  return (
    <AuthProvider>
      {children}
      <AuthModals />
    </AuthProvider>
  );
}