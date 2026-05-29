import { NextRequest, NextResponse } from 'next/server';
import { verifyCaptcha } from '@/lib/captcha';
import { hashPassword, validatePassword } from '@/lib/auth/password';
import { generateToken, getTokenExpiresAt } from '@/lib/auth/token';
import { users, sessions } from '@/lib/db/sqlite';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, nickname, captchaId, captchaCode } = body;

    // 验证图形验证码
    const captchaResult = verifyCaptcha(captchaId, captchaCode);
    if (!captchaResult.valid) {
      return NextResponse.json({
        success: false,
        error: captchaResult.error,
      }, { status: 400 });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        error: '邮箱格式不正确',
      }, { status: 400 });
    }

    // 验证密码强度
    const passwordResult = validatePassword(password);
    if (!passwordResult.valid) {
      return NextResponse.json({
        success: false,
        error: passwordResult.error,
      }, { status: 400 });
    }

    // 验证昵称
    if (!nickname || nickname.trim().length < 2) {
      return NextResponse.json({
        success: false,
        error: '昵称至少需要2个字符',
      }, { status: 400 });
    }

    // 检查邮箱是否已注册
    const existingUser = users.getByEmail(email);
    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: '该邮箱已被注册',
      }, { status: 400 });
    }

    // 创建用户
    const passwordHash = await hashPassword(password);
    const user = users.create({
      email,
      passwordHash,
      nickname: nickname.trim(),
    });

    // 创建会话
    const token = generateToken();
    const expiresAt = getTokenExpiresAt();
    sessions.create(user.id, token, expiresAt);

    console.log('[API /auth/register] user registered:', user.id, user.email);

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
    console.error('[API /auth/register] error:', error);
    return NextResponse.json({
      success: false,
      error: '注册失败',
    }, { status: 500 });
  }
}