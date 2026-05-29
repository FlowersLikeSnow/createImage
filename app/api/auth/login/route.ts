import { NextRequest, NextResponse } from 'next/server';
import { verifyCaptcha } from '@/lib/captcha';
import { verifyPassword } from '@/lib/auth/password';
import { generateToken, getTokenExpiresAt } from '@/lib/auth/token';
import { users, sessions } from '@/lib/db/sqlite';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, captchaId, captchaCode } = body;

    // 验证图形验证码
    const captchaResult = verifyCaptcha(captchaId, captchaCode);
    if (!captchaResult.valid) {
      return NextResponse.json({
        success: false,
        error: captchaResult.error,
      }, { status: 400 });
    }

    // 查找用户
    const user = users.getByEmail(email);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '邮箱或密码错误',
      }, { status: 400 });
    }

    // 验证密码
    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json({
        success: false,
        error: '邮箱或密码错误',
      }, { status: 400 });
    }

    // 获取客户端 IP
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    // 更新登录信息
    users.update(user.id, {
      lastLoginAt: Date.now(),
      lastLoginIp: ip,
    });

    // 创建新会话
    const token = generateToken();
    const expiresAt = getTokenExpiresAt();
    sessions.create(user.id, token, expiresAt);

    console.log('[API /auth/login] user logged in:', user.id, user.email, 'ip:', ip);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          avatar: user.avatar,
          credits: user.credits,
        },
        token,
      },
    });
  } catch (error) {
    console.error('[API /auth/login] error:', error);
    return NextResponse.json({
      success: false,
      error: '登录失败',
    }, { status: 500 });
  }
}