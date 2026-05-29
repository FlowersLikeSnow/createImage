import { NextResponse } from 'next/server';
import { generateCaptcha } from '@/lib/captcha';

export async function GET() {
  try {
    const { id, image } = generateCaptcha();
    return NextResponse.json({
      success: true,
      data: {
        captchaId: id,
        captchaImage: image,
      },
    });
  } catch (error) {
    console.error('[API /auth/captcha] error:', error);
    return NextResponse.json({
      success: false,
      error: '生成验证码失败',
    }, { status: 500 });
  }
}