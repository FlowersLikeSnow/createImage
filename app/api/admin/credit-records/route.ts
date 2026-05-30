import { NextRequest, NextResponse } from 'next/server';
import { creditRecords, users } from '@/lib/db/sqlite';
import { verifyAuth, requireAdmin } from '@/lib/auth';
import type { CreditRecordType } from '@/types/credit-record';

// GET: 查询消费记录
export async function GET(request: NextRequest) {
  const authResult = await verifyAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
  }

  if (!requireAdmin(authResult)) {
    return NextResponse.json({ success: false, error: '需要管理员权限' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const type = searchParams.get('type') as CreditRecordType | null;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  const offset = (page - 1) * pageSize;

  const records = creditRecords.getAll({
    userId: userId || undefined,
    type: type || undefined,
    limit: pageSize,
    offset,
  });

  const total = creditRecords.getCount(userId || undefined, type || undefined);
  const stats = creditRecords.getStats(userId || undefined);

  // 获取用户信息用于显示
  const allUsers = users.getAll();
  const userMap = new Map(allUsers.map(u => [u.id, u]));

  // 附加用户信息
  const recordsWithUser = records.map(r => ({
    ...r,
    userNickname: userMap.get(r.userId)?.nickname || '未知',
    userEmail: userMap.get(r.userId)?.email || '',
  }));

  return NextResponse.json({
    success: true,
    data: {
      records: recordsWithUser,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      stats,
    },
  });
}