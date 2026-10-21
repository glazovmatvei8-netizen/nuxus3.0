import type { NextConfig } from 'next';

/**
 * NUXUS PRODUCTION CONFIG V172.0 «ABSOLUTE BLACK BOX»
 * ОПТИМИЗИРОВАНО: Полное скрытие исходного кода и защита от декомпиляции.
 */
const nextConfig: NextConfig = {
  output: 'export', 
  trailingSlash: true, 
  productionBrowserSourceMaps: false, // ГАРАНТИРОВАННОЕ СКРЫТИЕ ПАПКИ SRC В F12
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
    // Агрессивная минификация в продакшене
    if (!dev && !isServer) {
      config.optimization.minimize = true;
      if (config.optimization.minimizer) {
        config.optimization.minimizer.forEach((m: any) => {
          if (m.options && m.options.terserOptions) {
            m.options.terserOptions.format = { comments: false };
            m.options.terserOptions.compress = {
              drop_console: true, // Удаляет все console.log для чистоты
              pure_funcs: ['console.info', 'console.debug', 'console.warn'],
            };
          }
        });
      }
    }
    return config;
  },
};

export default nextConfig;
