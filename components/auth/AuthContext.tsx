'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Modal } from 'antd';
import type { User } from '@/types/user';
import { getToken, saveToken, removeToken, fetchWithAuth } from '@/lib/api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginModalVisible: boolean;
  profileModalVisible: boolean;
  login: (email: string, password: string, captchaId: string, captchaCode: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, nickname: string, captchaId: string, captchaCode: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  showLoginModal: () => void;
  hideLoginModal: () => void;
  showProfileModal: () => void;
  hideProfileModal: () => void;
  requireAuth: () => boolean;
  updateProfile: (nickname: string) => Promise<{ success: boolean; error?: string }>;
  updateAvatar: (file: File) => Promise<{ success: boolean; error?: string; avatar?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  // 初始化时检查登录状态
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      setUser(null);
      return;
    }

    try {
      const response = await fetchWithAuth('/api/auth/me');
      const data = await response.json();

      if (data.success && data.data.user) {
        setUser(data.data.user);
      } else {
        removeToken();
        setUser(null);
      }
    } catch (error) {
      console.error('[AuthProvider] checkAuth error:', error);
      removeToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (
    email: string,
    password: string,
    captchaId: string,
    captchaCode: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, captchaId, captchaCode }),
      });

      const data = await response.json();

      if (data.success) {
        saveToken(data.data.token);
        setUser(data.data.user);
        setLoginModalVisible(false);
        return { success: true };
      }

      return { success: false, error: data.error };
    } catch (error) {
      console.error('[AuthProvider] login error:', error);
      return { success: false, error: '登录失败' };
    }
  }, []);

  const register = useCallback(async (
    email: string,
    password: string,
    nickname: string,
    captchaId: string,
    captchaCode: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, nickname, captchaId, captchaCode }),
      });

      const data = await response.json();

      if (data.success) {
        saveToken(data.data.token);
        setUser(data.data.user);
        setLoginModalVisible(false);
        return { success: true };
      }

      return { success: false, error: data.error };
    } catch (error) {
      console.error('[AuthProvider] register error:', error);
      return { success: false, error: '注册失败' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetchWithAuth('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('[AuthProvider] logout error:', error);
    }
    removeToken();
    setUser(null);
    setProfileModalVisible(false);
  }, []);

  const updateProfile = useCallback(async (nickname: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetchWithAuth('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ nickname }),
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.data.user);
        return { success: true };
      }

      return { success: false, error: data.error };
    } catch (error) {
      console.error('[AuthProvider] updateProfile error:', error);
      return { success: false, error: '更新失败' };
    }
  }, []);

  const updateAvatar = useCallback(async (file: File): Promise<{ success: boolean; error?: string; avatar?: string }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = getToken();
      const response = await fetch('/api/auth/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.data.user);
        return { success: true, avatar: data.data.avatar };
      }

      return { success: false, error: data.error };
    } catch (error) {
      console.error('[AuthProvider] updateAvatar error:', error);
      return { success: false, error: '头像上传失败' };
    }
  }, []);

  const showLoginModal = useCallback(() => {
    setLoginModalVisible(true);
  }, []);

  const hideLoginModal = useCallback(() => {
    setLoginModalVisible(false);
  }, []);

  const showProfileModal = useCallback(() => {
    setProfileModalVisible(true);
  }, []);

  const hideProfileModal = useCallback(() => {
    setProfileModalVisible(false);
  }, []);

  const requireAuth = useCallback(() => {
    if (user) {
      return true;
    }
    showLoginModal();
    return false;
  }, [user, showLoginModal]);

  const value: AuthContextType = {
    user,
    loading,
    loginModalVisible,
    profileModalVisible,
    login,
    register,
    logout,
    showLoginModal,
    hideLoginModal,
    showProfileModal,
    hideProfileModal,
    requireAuth,
    updateProfile,
    updateAvatar,
    refreshUser: checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}