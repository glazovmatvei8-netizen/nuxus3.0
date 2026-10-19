<<<<<<< HEAD

/**
 * REMOVED: Redundant config file causing build conflicts.
 * Root next.config.ts is the single source of truth.
 */
=======
import type { NextConfig } from 'next';

const isStaticExport = process.env.STATIC_EXPORT === 'true';

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
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
