export interface User {
  id: string;
  email: string;
  passwordHash: string;
  nickname: string;
  avatar?: string;
  createdAt: number;
  lastLoginAt?: number;
  lastLoginIp?: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  createdAt: number;
  expiresAt: number;
}

export interface Captcha {
  id: string;
  text: string;
  expiresAt: number;
}