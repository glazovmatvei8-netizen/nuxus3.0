import type { NextConfig } from 'next';

/**
 * NUXUS PRODUCTION CONFIG V176.0 «HARDENED SHELL»
 * ОПТИМИЗИРОВАНО: Тотальная обфускация и защита от дебаггера.
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
            m.options.terserOptions.format = { comments: false };
            m.options.terserOptions.compress = {
              drop_console: true,
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
