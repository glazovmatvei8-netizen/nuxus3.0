
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export', // АКТИВИРОВАНО ДЛЯ СБОРКИ ЧИСТОГО APK/IPA
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true, // ОБЯЗАТЕЛЬНО ДЛЯ СТАТИЧЕСКОГО ЭКСПОРТА
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: '*.gstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
      },
    ],
  },
};

export default nextConfig;
