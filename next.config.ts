<<<<<<< HEAD

import type { NextConfig } from 'next';

/**
 * NUXUS ABSOLUTE NATIVE CONFIG V71.0
 * ОПТИМИЗИРОВАНО ДЛЯ ГАРАНТИРОВАННОГО ЭКСПОРТА В ПАПКУ OUT
 */
const nextConfig: NextConfig = {
  output: 'export', 
  trailingSlash: true, 
  images: {
    unoptimized: true, 
  },
  typescript: {
    ignoreBuildErrors: true, 
=======
import type { NextConfig } from 'next';

const isStaticExport = process.env.STATIC_EXPORT === 'true';

/**
 * NUXUS ABSOLUTE NATIVE CONFIG
 * По умолчанию используется 'standalone' для AI Studio / Cloud Run.
 * При STATIC_EXPORT=true автоматически включается 'export' с выгрузкой в папку 'out' для сборки APK/IPA.
 */
const nextConfig: NextConfig = {
  output: isStaticExport ? 'export' : 'standalone',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
<<<<<<< HEAD
  // Отключаем серверные функции, так как Beget — статический хостинг
  distDir: '.next',
=======
  ...(isStaticExport ? {} : { distDir: '.next' }),
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
};

export default nextConfig;
