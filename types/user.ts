export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  nickname: string;
  avatar?: string;
  credits: number;           // 当前剩余积分
  consumedCredits: number;   // 累计消耗积分
  totalCredits: number;      // 累计获得积分（包含消耗的）
  role: UserRole;            // 用户角色
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