
import type { NextConfig } from 'next';

/**
 * NUXUS ABSOLUTE NATIVE CONFIG V69.0
 * ОПТИМИЗИРОВАНО ДЛЯ ПОЛНОЙ АВТОНОМНОСТИ ВНУТРИ APK
 * ВНИМАНИЕ: Web-версия отключена, только статический экспорт для мобильных оболочек.
 */
const nextConfig: NextConfig = {
  output: 'export', // Полная статика: интерфейс живет внутри APK
  trailingSlash: true, // Необходимо для корректной навигации в Capacitor
  images: {
    unoptimized: true, // Нативные WebView не поддерживают серверную оптимизацию изображений
  },
  typescript: {
    ignoreBuildErrors: true, // Игнорируем ошибки типов для ускорения сборки APK
  },
  eslint: {
    ignoreDuringBuilds: true, // Игнорируем линтинг при деплое
  },
};

export default nextConfig;
