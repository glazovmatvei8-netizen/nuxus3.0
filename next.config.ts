
import type { NextConfig } from 'next';

/**
 * NUXUS PRODUCTION CONFIG V178.0 «TITANIUM HARDENING»
 * ОПТИМИЗИРОВАНО: Максимальная обфускация и защита доменов.
 */
const nextConfig: NextConfig = {
  output: 'export', 
  trailingSlash: true, 
  productionBrowserSourceMaps: false, 
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
    if (!dev && !isServer) {
      config.optimization.minimize = true;
      if (config.optimization.minimizer) {
        config.optimization.minimizer.forEach((m: any) => {
          if (m.options && m.options.terserOptions) {
            // Удаление комментариев и лишней информации
            m.options.terserOptions.format = { comments: false };
            m.options.terserOptions.compress = {
              drop_console: true,
              drop_debugger: false, 
              pure_funcs: ['console.info', 'console.debug', 'console.warn'],
              passes: 3, 
            };
            m.options.terserOptions.mangle = true; 
          }
        });
      }
    }
    return config;
  },
};

export default nextConfig;
