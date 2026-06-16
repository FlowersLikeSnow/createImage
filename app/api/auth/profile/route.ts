import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/middleware';
import { users } from '@/lib/db/sqlite';

export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);

    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: authResult.error,
      }, { status: 401 });
    }

    const body = await request.json();
    const { nickname, avatar } = body;

    // 至少需要更新一个字段
    if (!nickname && !avatar) {
      return NextResponse.json({
        success: false,
        error: '请提供要更新的字段',
      }, { status: 400 });
    }

    // 验证昵称
    if (nickname && nickname.trim().length < 2) {
      return NextResponse.json({
        success: false,
        error: '昵称至少需要2个字符',
      }, { status: 400 });
    }

    // 构建更新数据
    const updateData: { nickname?: string; avatar?: string } = {};
    if (nickname) {
      updateData.nickname = nickname.trim();
    }
    if (avatar) {
      updateData.avatar = avatar;
    }

    // 更新用户信息
    const user = users.update(authResult.userId!, updateData);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: '用户不存在',
      }, { status: 404 });
    }

    console.log('[API /auth/profile] user profile updated:', user.id, 'nickname:', nickname);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          avatar: user.avatar,
        },
      },
    });
  } catch (error) {
    console.error('[API /auth/profile] error:', error);
    return NextResponse.json({
      success: false,
      error: '更新个人信息失败',
    }, { status: 500 });
  }
}