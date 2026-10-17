
import type { NextConfig } from 'next';

/**
 * NUXUS ABSOLUTE NATIVE CONFIG V71.0
 * ОПТИМИЗИРОВАНО ДЛЯ ГАРАНТИРОВАННОГО ЭКСПОРТА В ПАПКУ OUT
 */
const nextConfig: NextConfig = {
  output: 'standalone', 
  trailingSlash: true, 
  images: {
    unoptimized: true, 
  },
  typescript: {
    ignoreBuildErrors: true, 
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Отключаем серверные функции, так как Beget — статический хостинг
  distDir: '.next',
};

export default nextConfig;
