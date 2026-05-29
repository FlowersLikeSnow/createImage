import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/middleware';
import { redemptionCodes, users } from '@/lib/db/sqlite';
import { validateCodeFormat, formatUserCodeInput } from '@/lib/utils/redemption-code';

/**
 * 用户兑换接口
 * POST /api/redemption/redeem
 */
export async function POST(request: NextRequest) {
  // 验证登录状态
  const authResult = await verifyAuth(request);
  if (!authResult.success) {
    return NextResponse.json({
      success: false,
      error: authResult.error,
    }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({
        success: false,
        error: '请输入兑换码',
      }, { status: 400 });
    }

    // 格式化用户输入
    const formattedCode = formatUserCodeInput(code.trim());

    // 验证格式
    if (!validateCodeFormat(formattedCode)) {
      return NextResponse.json({
        success: false,
        error: '兑换码格式无效',
      }, { status: 400 });
    }

    // 使用兑换码（事务操作）
    const result = redemptionCodes.useCode(formattedCode, authResult.userId!);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 400 });
    }

    // 获取更新后的用户积分
    const updatedUser = users.getById(authResult.userId!);

    console.log('[API /redemption/redeem] User redeemed code:', formattedCode, 'credits:', result.credits);

    return NextResponse.json({
      success: true,
      data: {
        credits: result.credits,
        totalCredits: updatedUser?.credits || 0,
        message: `兑换成功！获得 ${result.credits} 积分`,
      },
    });
  } catch (error) {
    console.error('[API /redemption/redeem] error:', error);
    return NextResponse.json({
      success: false,
      error: '兑换失败，请稍后重试',
    }, { status: 500 });
  }
}