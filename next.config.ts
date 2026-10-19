import type { NextConfig } from 'next';

/**
 * NUXUS ABSOLUTE NATIVE CONFIG V154
 * ОПТИМИЗИРОВАНО ДЛЯ ГАРАНТИРОВАННОГО ЭКСПОРТА И РАБОТЫ ЯДРА
 */
const nextConfig: NextConfig = {
  output: 'export', 
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
  distDir: '.next',
};

export default nextConfig;