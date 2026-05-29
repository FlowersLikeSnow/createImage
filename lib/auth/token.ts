import crypto from 'crypto';
import { nanoid } from 'nanoid';

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex') + nanoid(16);
}

export function getTokenExpiresAt(): number {
  return Date.now() + 7 * 24 * 60 * 60 * 1000; // 7天
}

export function isTokenExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt;
}