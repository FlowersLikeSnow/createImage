import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // 安全检查：防止路径遍历攻击
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: '无效的文件名' }, { status: 400 });
    }

    const filepath = path.join(IMAGES_DIR, filename);

    // 检查文件是否存在
    if (!fs.existsSync(filepath)) {
      return NextResponse.json({ error: '图片不存在' }, { status: 404 });
    }

    // 读取文件
    const fileBuffer = fs.readFileSync(filepath);

    // 根据扩展名设置 Content-Type
    const ext = path.extname(filename).toLowerCase();
    const contentType = ext === '.png' ? 'image/png'
      : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
      : ext === '.gif' ? 'image/gif'
      : ext === '.webp' ? 'image/webp'
      : 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // 缓存1年
      },
    });
  } catch (error) {
    console.error('[API /images/file] error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '读取图片失败',
    }, { status: 500 });
  }
}