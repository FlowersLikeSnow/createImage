import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/middleware';
import { redemptionCodes, users } from '@/lib/db/sqlite';
import { generateBatchCodes } from '@/lib/utils/redemption-code';
import { nanoid } from 'nanoid';

/**
 * 验证管理员权限
 */
function requireAdmin(userId: string): boolean {
  const user = users.getById(userId);
  return !!user && user.role === 'admin';
}

/**
 * 管理员兑换码接口
 * POST /api/admin/redemption - 生成兑换码
 * GET /api/admin/redemption - 查询兑换码列表
 * PUT /api/admin/redemption - 更新兑换码状态（禁用/启用）
 */

// 生成兑换码
export async function POST(request: NextRequest) {
  const authResult = await verifyAuth(request);
  if (!authResult.success) {
    return NextResponse.json({
      success: false,
      error: '未授权',
    }, { status: 401 });
  }

  if (!requireAdmin(authResult.userId!)) {
    return NextResponse.json({
      success: false,
      error: '无权限',
    }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { count, credits, expiresInDays, remark } = body;

    // 参数验证
    if (!count || count < 1 || count > 1000) {
      return NextResponse.json({
        success: false,
        error: '数量需在 1-1000 之间',
      }, { status: 400 });
    }

    if (!credits || credits <= 0) {
      return NextResponse.json({
        success: false,
        error: '积分面值必须大于0',
      }, { status: 400 });
    }

    // 生成批次ID
    const batchId = nanoid();
    const expiresAt = expiresInDays
      ? Date.now() + expiresInDays * 24 * 60 * 60 * 1000
      : undefined;

    // 生成兑换码
    const codes = generateBatchCodes(count, credits);
    const codesWithMeta = codes.map(c => ({
      ...c,
      batchId,
      expiresAt,
    }));

    // 批量插入数据库
    const insertedCount = redemptionCodes.createBatch(codesWithMeta);

    console.log('[API /admin/redemption] Generated codes:', insertedCount, 'batch:', batchId);

    return NextResponse.json({
      success: true,
      data: {
        batchId,
        count: insertedCount,
        codes: codes.map(c => c.code),
        credits,
        expiresAt,
      },
    });
  } catch (error) {
    console.error('[API /admin/redemption POST] error:', error);
    return NextResponse.json({
      success: false,
      error: '生成失败',
    }, { status: 500 });
  }
}

// 查询兑换码列表
export async function GET(request: NextRequest) {
  const authResult = await verifyAuth(request);
  if (!authResult.success) {
    return NextResponse.json({
      success: false,
      error: '未授权',
    }, { status: 401 });
  }

  if (!requireAdmin(authResult.userId!)) {
    return NextResponse.json({
      success: false,
      error: '无权限',
    }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let codes: any[] = [];

    if (batchId) {
      codes = redemptionCodes.getByBatchId(batchId);
    } else {
      codes = redemptionCodes.getAll(limit, offset);
    }

    // 根据状态筛选
    if (status && ['unused', 'used', 'disabled'].includes(status)) {
      codes = codes.filter(c => c.status === status);
    }

    // 获取统计信息
    const stats = redemptionCodes.getStats();

    return NextResponse.json({
      success: true,
      data: {
        codes: codes.map(c => ({
          id: c.id,
          code: c.code,
          credits: c.credits,
          status: c.status,
          createdAt: c.createdAt,
          expiresAt: c.expiresAt,
          usedBy: c.usedBy,
          usedAt: c.usedAt,
          remark: c.remark,
        })),
        stats,
      },
    });
  } catch (error) {
    console.error('[API /admin/redemption GET] error:', error);
    return NextResponse.json({
      success: false,
      error: '查询失败',
    }, { status: 500 });
  }
}

// 更新兑换码状态（禁用/启用）
export async function PUT(request: NextRequest) {
  const authResult = await verifyAuth(request);
  if (!authResult.success) {
    return NextResponse.json({
      success: false,
      error: '未授权',
    }, { status: 401 });
  }

  if (!requireAdmin(authResult.userId!)) {
    return NextResponse.json({
      success: false,
      error: '无权限',
    }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({
        success: false,
        error: '请提供兑换码ID',
      }, { status: 400 });
    }

    if (!status || !['unused', 'used', 'disabled'].includes(status)) {
      return NextResponse.json({
        success: false,
        error: '状态值无效，必须是 unused、used 或 disabled',
      }, { status: 400 });
    }

    const success = redemptionCodes.updateStatus(id, status);

    if (!success) {
      return NextResponse.json({
        success: false,
        error: '兑换码不存在或状态未改变',
      }, { status: 400 });
    }

    console.log('[API /admin/redemption PUT] Updated code status:', id, 'to:', status);

    return NextResponse.json({
      success: true,
      data: {
        id,
        status,
      },
    });
  } catch (error) {
    console.error('[API /admin/redemption PUT] error:', error);
    return NextResponse.json({
      success: false,
      error: '更新失败',
    }, { status: 500 });
  }
}