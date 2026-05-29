import { nanoid } from 'nanoid';
import type { Captcha } from '@/types/user';

// 内存存储验证码
declare global {
  // eslint-disable-next-line no-var
  var captchaStore: Map<string, Captcha> | undefined;
}

const captchaStore = global.captchaStore || new Map<string, Captcha>();
if (!global.captchaStore) {
  global.captchaStore = captchaStore;
}

const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CAPTCHA_LENGTH = 4;
const CAPTCHA_EXPIRES = 5 * 60 * 1000; // 5分钟

export function generateCaptcha(): { id: string; image: string } {
  let text = '';
  for (let i = 0; i < CAPTCHA_LENGTH; i++) {
    text += CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)];
  }

  const id = nanoid();
  const expiresAt = Date.now() + CAPTCHA_EXPIRES;
  captchaStore.set(id, { id, text, expiresAt });

  const image = generateCaptchaImage(text);
  return { id, image };
}

export function verifyCaptcha(id: string, code: string): { valid: boolean; error?: string } {
  const captcha = captchaStore.get(id);

  if (!captcha) {
    return { valid: false, error: '验证码不存在，请刷新' };
  }

  if (Date.now() > captcha.expiresAt) {
    captchaStore.delete(id);
    return { valid: false, error: '验证码已过期，请刷新' };
  }

  const valid = captcha.text.toUpperCase() === code.toUpperCase();

  if (valid) {
    captchaStore.delete(id);
  }

  return { valid };
}

function generateCaptchaImage(text: string): string {
  const width = 120;
  const height = 40;
  const fontSize = 24;

  // 随机干扰线和噪点
  let lines = '';
  for (let i = 0; i < 4; i++) {
    const x1 = Math.random() * width;
    const y1 = Math.random() * height;
    const x2 = Math.random() * width;
    const y2 = Math.random() * height;
    const color = `rgb(${Math.floor(Math.random() * 150)}, ${Math.floor(Math.random() * 150)}, ${Math.floor(Math.random() * 150)})`;
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1"/>`;
  }

  let dots = '';
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const color = `rgb(${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)})`;
    dots += `<circle cx="${x}" cy="${y}" r="1" fill="${color}"/>`;
  }

  // 每个字符随机旋转
  const chars = text.split('').map((char, i) => {
    const x = 25 + i * 22;
    const y = 28;
    const rotate = Math.floor(Math.random() * 30 - 15);
    const color = `rgb(${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)})`;
    return `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="Arial" fill="${color}" transform="rotate(${rotate} ${x} ${y})">${char}</text>`;
  });

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#f5f5f5"/>
      ${lines}
      ${dots}
      ${chars.join('')}
    </svg>
  `;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export function cleanExpiredCaptcha(): number {
  const now = Date.now();
  let count = 0;
  captchaStore.forEach((captcha, id) => {
    if (captcha.expiresAt < now) {
      captchaStore.delete(id);
      count++;
    }
  });
  return count;
}