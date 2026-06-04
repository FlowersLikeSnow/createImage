import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 配置服务器外部包（better-sqlite3 是原生模块）
  serverExternalPackages: ['better-sqlite3'],
  // 配置 turbopack
  turbopack: {},
  
};

export default nextConfig;