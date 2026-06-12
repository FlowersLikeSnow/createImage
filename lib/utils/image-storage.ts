import { downloadAndUpload, deleteFile, extractKeyFromUrl } from './qiniu-upload';

/**
 * 从 URL 下载图片并上传到七牛云
 * @param imageUrl 外部图片 URL
 * @returns 七牛云图片 URL
 */
export async function saveImageToCloud(imageUrl: string): Promise<string> {
  return downloadAndUpload(imageUrl);
}

/**
 * 删除七牛云上的图片
 * @param imageUrl 七牛云图片 URL
 */
export async function deleteCloudImage(imageUrl: string): Promise<boolean> {
  return deleteFile(imageUrl);
}

/**
 * 从 URL 中提取文件 key
 * @param url 图片 URL
 * @returns 文件 key
 */
export function extractImageKey(url: string): string {
  return extractKeyFromUrl(url);
}

// 保留旧函数名作为别名（向后兼容）
export const saveImageLocally = saveImageToCloud;
export const deleteLocalImage = deleteCloudImage;