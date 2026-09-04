
import type { NextConfig } from 'next';

/**
 * NUXUS ABSOLUTE NATIVE CONFIG V70.0
 * ОПТИМИЗИРОВАНО ДЛЯ ПОЛНОЙ АВТОНОМНОСТИ ВНУТРИ APK
 */
const nextConfig: NextConfig = {
  output: 'export', // Полная статика: интерфейс живет внутри APK
  trailingSlash: true, // Необходимо для корректной навигации в Capacitor
  images: {
    unoptimized: true, // Нативные WebView не поддерживают серверную оптимизацию изображений
  },
  typescript: {
    ignoreBuildErrors: true, // Игнорируем ошибки типов для ускорения сборки в облаке
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
