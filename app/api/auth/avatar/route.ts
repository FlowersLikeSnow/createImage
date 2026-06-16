import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/middleware';
import { users } from '@/lib/db/sqlite';
import { uploadBuffer, deleteFile, extractKeyFromUrl } from '@/lib/utils/qiniu-upload';
import { nanoid } from 'nanoid';

// 用户头像上传 API
// 上传到七牛云 GPT-Image-2/users 路径
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);

    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: authResult.error,
      }, { status: 401 });
    }

    // 获取上传的文件
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: '请选择要上传的图片',
      }, { status: 400 });
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: '仅支持 JPG、PNG、GIF、WebP 格式的图片',
      }, { status: 400 });
    }

    // 验证文件大小 (最大 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({
        success: false,
        error: '图片大小不能超过 2MB',
      }, { status: 400 });
    }

    const userId = authResult.userId!;

    // 获取用户旧头像，用于后续删除
    const oldUser = users.getById(userId);
    const oldAvatar = oldUser?.avatar;

    // 获取文件扩展名
    const ext = file.name.split('.').pop() || 'png';

    // 生成文件名: users/userId_timestamp_nanoid.ext
    const fileName = `users/${userId}_${Date.now()}_${nanoid(6)}.${ext}`;

    // 转换为 Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 上传到七牛云
    const result = await uploadBuffer(buffer, fileName);

    console.log('[API /auth/avatar] avatar uploaded:', result.url, 'for user:', userId);

    // 更新用户头像
    const user = users.update(userId, { avatar: result.url });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: '用户不存在',
      }, { status: 404 });
    }

    // 新头像上传成功后，删除旧头像（如果有）
    if (oldAvatar && oldAvatar.includes('QINIU_DOMAIN') || oldAvatar?.startsWith('http')) {
      try {
        const oldKey = extractKeyFromUrl(oldAvatar);
        await deleteFile(oldKey);
        console.log('[API /auth/avatar] deleted old avatar:', oldKey);
      } catch (deleteError) {
        // 删除失败不影响主流程，只记录日志
        console.error('[API /auth/avatar] failed to delete old avatar:', deleteError);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        avatar: result.url,
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          avatar: user.avatar,
        },
      },
    });
  } catch (error) {
    console.error('[API /auth/avatar] error:', error);
    return NextResponse.json({
      success: false,
      error: '头像上传失败',
    }, { status: 500 });
  }
}