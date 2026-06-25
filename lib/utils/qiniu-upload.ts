import qiniu from 'qiniu';
import { nanoid } from 'nanoid';
import sharp from 'sharp';

// 七牛云配置
const config = {
  accessKey: process.env.QINIU_ACCESS_KEY || '',
  secretKey: process.env.QINIU_SECRET_KEY || '',
  bucket: process.env.QINIU_BUCKET || '',
  zone: process.env.QINIU_ZONE || 'z2',
  domain: process.env.QINIU_DOMAIN || '',
  folder: process.env.QINIU_FOLDER || 'GPT-Image-2', // 上传文件夹
};

// 图片压缩配置
const COMPRESS_OPTIONS = {
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 82, // WebP 质量，肉眼无损
};

// 获取区域配置
function getZone() {
  switch (config.zone) {
    case 'z0':
      return qiniu.zone.Zone_z0;
    case 'z1':
      return qiniu.zone.Zone_z1;
    case 'z2':
      return qiniu.zone.Zone_z2;
    default:
      return qiniu.zone.Zone_z2;
  }
}

// 创建上传配置
function createUploadConfig(): qiniu.conf.Config {
  const cfg = new qiniu.conf.Config();
  cfg.zone = getZone();
  cfg.useHttpsDomain = false;
  cfg.accelerateUploading = false;
  return cfg;
}

// 生成上传 token
function generateUploadToken(): string {
  const mac = new qiniu.auth.digest.Mac(config.accessKey, config.secretKey);
  const putPolicy = new qiniu.rs.PutPolicy({
    scope: config.bucket,
  });
  return putPolicy.uploadToken(mac);
}

/**
 * 压缩图片（转 WebP 并限制尺寸）
 * @param buffer 原始图片 Buffer
 * @returns 压缩后的 Buffer
 */
async function compressImage(buffer: Buffer): Promise<Buffer> {
  try {
    const originalSize = buffer.length;

    // 如果图片已经很小，不压缩
    if (originalSize < 100 * 1024) { // 小于 100KB
      return buffer;
    }

    const compressed = await sharp(buffer)
      .resize(COMPRESS_OPTIONS.maxWidth, COMPRESS_OPTIONS.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toFormat('webp', {
        quality: COMPRESS_OPTIONS.quality,
        effort: 6, // 压缩效率，0-6，越高文件越小但越慢
      })
      .toBuffer();

    const compressedSize = compressed.length;
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    console.log(`[QiniuUpload] Compressed: ${originalSize} -> ${compressedSize} bytes (${ratio}% smaller)`);

    return compressed;
  } catch (error) {
    console.error('[QiniuUpload] Compress error, using original:', error);
    return buffer; // 压缩失败，返回原图
  }
}

/**
 * 上传 Buffer 到七牛云（自动压缩）
 * @param buffer 文件 Buffer
 * @param key 文件名（可选，默认使用 nanoid 生成）
 * @param ext 文件扩展名（可选，上传后统一为 .webp）
 * @returns 上传结果 { url, key }
 */
export async function uploadBuffer(
  buffer: Buffer,
  key?: string,
  _ext?: string
): Promise<{ url: string; key: string }> {
  // 压缩图片
  const compressedBuffer = await compressImage(buffer);

  // 生成文件名，添加文件夹前缀，统一使用 .webp 格式
  const fileName = key || `${nanoid(12)}.webp`;
  const finalKey = `${config.folder}/${fileName}`;
  const token = generateUploadToken();

  const formUploader = new qiniu.form_up.FormUploader(createUploadConfig());
  const putExtra = new qiniu.form_up.PutExtra();

  return new Promise((resolve, reject) => {
    formUploader.put(token, finalKey, compressedBuffer, putExtra, (err, body, info) => {
      if (err) {
        console.error('[QiniuUpload] Upload error:', err);
        reject(err);
        return;
      }
      if (info.statusCode === 200) {
        const url = `http://${config.domain}/${finalKey}`;
        console.log('[QiniuUpload] Upload success:', url);
        resolve({ url, key: finalKey });
      } else {
        console.error('[QiniuUpload] Upload failed:', info.statusCode, body);
        reject(new Error(`Upload failed: ${info.statusCode}`));
      }
    });
  });
}

/**
 * 上传 File 到七牛云（用于 API 路由处理上传文件，自动压缩）
 * @param file 文件对象
 * @returns 上传结果 { url, key }
 */
export async function uploadFile(file: File): Promise<{ url: string; key: string }> {
  const key = `${nanoid()}.webp`;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  return uploadBuffer(buffer, key);
}

/**
 * 从 URL 下载图片并上传到七牛云
 * @param imageUrl 外部图片 URL
 * @param ext 文件扩展名（可选，默认 .png）
 * @returns 七牛云 URL
 */
export async function downloadAndUpload(imageUrl: string, ext?: string): Promise<string> {
  try {
    console.log('[QiniuUpload] Downloading image from:', imageUrl);

    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadBuffer(buffer, undefined, ext || '.png');
    console.log('[QiniuUpload] Image uploaded to:', result.url);

    return result.url;
  } catch (error) {
    console.error('[QiniuUpload] Download and upload error:', error);
    // 返回原始 URL 作为备选
    return imageUrl;
  }
}

/**
 * 删除七牛云上的文件
 * @param key 文件名（或完整 URL）
 * @returns 是否删除成功
 */
export async function deleteFile(key: string): Promise<boolean> {
  try {
    // 如果是完整 URL，正确提取 key（包含文件夹路径）
    const finalKey = (key.startsWith('http://') || key.startsWith('https://'))
      ? extractKeyFromUrl(key)
      : key;

    console.log('[QiniuUpload] Deleting file:', finalKey);

    const mac = new qiniu.auth.digest.Mac(config.accessKey, config.secretKey);
    const bucketManager = new qiniu.rs.BucketManager(mac, createUploadConfig());

    return new Promise((resolve) => {
      bucketManager.delete(config.bucket, finalKey, (err, body, info) => {
        if (err) {
          console.error('[QiniuUpload] Delete error:', err);
          resolve(false);
          return;
        }
        if (info.statusCode === 200) {
          console.log('[QiniuUpload] Delete success:', finalKey);
          resolve(true);
        } else {
          console.error('[QiniuUpload] Delete failed:', info.statusCode, body);
          resolve(false);
        }
      });
    });
  } catch (error) {
    console.error('[QiniuUpload] Delete error:', error);
    return false;
  }
}

/**
 * 从七牛云 URL 提取 key（包含文件夹路径）
 * @param url 七牛云完整 URL
 * @returns 文件 key（包含文件夹前缀）
 */
export function extractKeyFromUrl(url: string): string {
  if (!url.includes(config.domain)) {
    return url; // 不是七牛云 URL，返回原始值
  }
  // 提取 domain 之后的所有路径作为 key
  const domainIndex = url.indexOf(config.domain);
  return url.substring(domainIndex + config.domain.length + 1);
}