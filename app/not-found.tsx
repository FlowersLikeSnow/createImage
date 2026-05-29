'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-8xl font-bold text-gray-200">404</h1>
      <p className="text-xl text-gray-500 mt-4">页面不存在</p>
      <p className="text-sm text-gray-400 mt-2">您访问的页面可能已被移除或暂时不可用</p>
      <Link
        href="/"
        className="mt-8 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        返回首页
      </Link>
    </div>
  );
}