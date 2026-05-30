import { NextRequest, NextResponse } from 'next/server';
import { users } from '@/lib/db/sqlite';
import { verifyAuth, requireAdmin } from '@/lib/auth';

// PUT: 管理员调整用户积分
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
  }

  if (!requireAdmin(authResult)) {
    return NextResponse.json({ success: false, error: '需要管理员权限' }, { status: 403 });
  }

  const { id: userId } = await params;
  const body = await request.json();
  const { amount, remark } = body;

  if (typeof amount !== 'number' || amount === 0) {
    return NextResponse.json({ success: false, error: '调整金额必须为非零数字' });
  }

  const result = users.adjustCredits(userId, amount, remark || '', authResult.userId!);

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error });
  }

  return NextResponse.json({
    success: true,
    data: {
      credits: result.credits,
    },
  });
}