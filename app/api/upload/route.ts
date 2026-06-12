import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/utils/qiniu-upload';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: '缺少文件' }, { status: 400 });
    }

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: '只支持图片文件' }, { status: 400 });
    }

    // 验证文件大小 (最大 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: '文件大小不能超过10MB' }, { status: 400 });
    }

    // 上传到七牛云
    const result = await uploadFile(file);

    return NextResponse.json({
      success: true,
      url: result.url,
      fileName: result.key,
    });
  } catch (error) {
    console.error('[API /upload] error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '上传失败',
    }, { status: 500 });
  }
}