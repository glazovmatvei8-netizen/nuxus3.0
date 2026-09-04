
import type { NextConfig } from 'next';

/**
 * NUXUS NATIVE CONFIG V68.0
 * ОПТИМИЗИРОВАНО ДЛЯ СБОРКИ APK/IPA БЕЗ ОШИБОК 500
 */
const nextConfig: NextConfig = {
  output: 'export', // КРИТИЧЕСКИ ВАЖНО: Создает статическое приложение для APK
  trailingSlash: true, // Улучшает роутинг внутри нативного приложения
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true, // ОБЯЗАТЕЛЬНО: Нативные приложения не поддерживают оптимизацию Next.js
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: '*.gstatic.com' },
      { protocol: 'https', hostname: 'i.ibb.co' },
    ],
  },
};

export default nextConfig;
