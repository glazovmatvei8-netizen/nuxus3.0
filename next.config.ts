import type { NextConfig } from 'next';

/**
 * NUXUS PRODUCTION CONFIG V171.0 «ABSOLUTE BLACK BOX»
 * ОПТИМИЗИРОВАНО ДЛЯ ПОЛНОЙ СКРЫТНОСТИ И ЗАЩИТЫ ОТ F12
 */
const nextConfig: NextConfig = {
  output: 'export', 
  trailingSlash: true, 
  productionBrowserSourceMaps: false, // ПОЛНОЕ ОТКЛЮЧЕНИЕ КАРТ КОДА (Скрывает папку src и код в F12)
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
    // Дополнительная обфускация и защита в продакшене
    if (!dev && !isServer) {
      config.optimization.minimize = true;
      // Удаляем комментарии из скомпилированного JS
      if (config.optimization.minimizer) {
        config.optimization.minimizer.forEach((m: any) => {
          if (m.options && m.options.terserOptions) {
            m.options.terserOptions.format = { comments: false };
          }
        });
      }
    }
    return config;
  },
};

export default nextConfig;
