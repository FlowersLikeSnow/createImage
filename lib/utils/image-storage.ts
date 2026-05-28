import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';

// 图片存储目录（相对于项目根目录）
const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');

// 确保目录存在
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  console.log('[ImageStorage] Created directory:', IMAGES_DIR);
}

/**
 * 从 URL 下载图片并保存到本地
 * @param imageUrl 外部图片 URL
 * @returns 本地图片 URL（相对路径）
 */
export async function saveImageLocally(imageUrl: string): Promise<string> {
  try {
    // 生成唯一文件名
    const filename = `${nanoid(12)}.png`;
    const filepath = path.join(IMAGES_DIR, filename);

    // 下载图片
    console.log('[ImageStorage] Downloading image from:', imageUrl);
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    // 获取图片数据
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 保存到本地
    fs.writeFileSync(filepath, buffer);
    console.log('[ImageStorage] Saved image to:', filepath);

    // 返回本地 URL（相对于 public 目录）
    return `/images/${filename}`;
  } catch (error) {
    console.error('[ImageStorage] Error saving image:', error);
    // 返回原始 URL 作为备选
    return imageUrl;
  }
}

/**
 * 删除本地图片
 * @param localUrl 本地图片 URL
 */
export function deleteLocalImage(localUrl: string): boolean {
  try {
    if (!localUrl.startsWith('/images/')) {
      return false;
    }

    const filename = localUrl.replace('/images/', '');
    const filepath = path.join(IMAGES_DIR, filename);

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log('[ImageStorage] Deleted image:', filepath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[ImageStorage] Error deleting image:', error);
    return false;
  }
}

/**
 * 获取所有本地图片列表
 */
export function getLocalImages(): string[] {
  try {
    const files = fs.readdirSync(IMAGES_DIR);
    return files.filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'))
      .map(f => `/images/${f}`);
  } catch (error) {
    console.error('[ImageStorage] Error reading images:', error);
    return [];
  }
}