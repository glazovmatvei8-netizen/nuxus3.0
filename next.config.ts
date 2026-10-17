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
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  ...(isStaticExport ? {} : { distDir: '.next' }),
};

export default nextConfig;
