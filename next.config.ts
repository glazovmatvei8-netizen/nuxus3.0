import type { NextConfig } from 'next';

/**
 * NUXUS PRODUCTION CONFIG V169.0 «BLACK BOX»
 * ОПТИМИЗИРОВАНО ДЛЯ ПОЛНОЙ СКРЫТНОСТИ ИСХОДНОГО КОДА
 */
const nextConfig: NextConfig = {
  output: 'export', 
  trailingSlash: true, 
  productionBrowserSourceMaps: false, // ПОЛНОЕ ОТКЛЮЧЕНИЕ КАРТ КОДА (Скрывает папку src в F12)
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
  webpack: (config, { dev, isServer }) => {
    // Дополнительная обфускация в продакшене
    if (!dev && !isServer) {
      config.optimization.minimize = true;
    }
    return config;
  },
};

export default nextConfig;