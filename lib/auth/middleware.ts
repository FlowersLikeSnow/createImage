import { NextRequest, NextResponse } from 'next/server';
import { sessions, users } from '@/lib/db/sqlite';

export interface AuthResult {
  success: boolean;
  userId?: string;
  user?: { id: string; role: string };
  error?: string;
}

export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, error: '请先登录' };
  }

  const token = authHeader.slice(7);
  const session = sessions.getByToken(token);

  if (!session) {
    return { success: false, error: 'Token无效' };
  }

  if (Date.now() > session.expiresAt) {
    sessions.deleteByToken(token);
    return { success: false, error: 'Token已过期，请重新登录' };
  }

  const user = users.getById(session.userId);
  if (!user) {
    sessions.deleteByToken(token);
    return { success: false, error: '用户不存在' };
  }

  return { success: true, userId: user.id, user: { id: user.id, role: user.role } };
}

export function requireAdmin(authResult: AuthResult): boolean {
  return authResult.success && authResult.user?.role === 'admin';
}

export function withAuthResponse(error: string): NextResponse {
  return NextResponse.json(
    { success: false, error },
    { status: 401 }
  );
}