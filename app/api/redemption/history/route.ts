import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/middleware';
import { redemptionCodes } from '@/lib/db/sqlite';

/**
 * 用户兑换记录接口
 * GET /api/redemption/history
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAuth(request);
  if (!authResult.success) {
    return NextResponse.json({
      success: false,
      error: authResult.error,
    }, { status: 401 });
  }

  try {
    const records = redemptionCodes.getByUserId(authResult.userId!);

    return NextResponse.json({
      success: true,
      data: {
        records: records.map(r => ({
          // 隐藏部分兑换码（只显示前10位）
          code: r.code.slice(0, 10) + '****',
          credits: r.credits,
          usedAt: r.usedAt,
        })),
      },
    });
  } catch (error) {
    console.error('[API /redemption/history] error:', error);
    return NextResponse.json({
      success: false,
      error: '查询失败',
    }, { status: 500 });
  }
}