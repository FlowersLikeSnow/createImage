'use client';

import { AuthProvider } from '@/components/auth/AuthContext';
import { LoginModal } from '@/components/auth/LoginModal';
import { RegisterModal } from '@/components/auth/RegisterModal';
import { ProfileModal } from '@/components/auth/ProfileModal';
import { useState } from 'react';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const [showRegister, setShowRegister] = useState(false);

  return (
    <AuthProvider>
      {children}
      {!showRegister && (
        <LoginModal onSwitchToRegister={() => setShowRegister(true)} />
      )}
      {showRegister && (
        <RegisterModal onSwitchToLogin={() => setShowRegister(false)} />
      )}
      <ProfileModal />
    </AuthProvider>
  );
}