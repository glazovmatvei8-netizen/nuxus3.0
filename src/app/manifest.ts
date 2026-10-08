
import { MetadataRoute } from 'next'

/**
 * КРИТИЧЕСКИЙ ФИКС ДЛЯ СТАТИЧЕСКОГО ЭКСПОРТА (IPA/RU-HOSTING)
 * Принудительно переводит манифест в статический режим.
 */
export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  // Новая иконка с cache-buster для принудительного обновления на устройствах
  const APP_ICON_URL = 'https://i.postimg.cc/T2xvz0mn/IMG-2541.jpg?v=113';
  
  return {
    id: 'chat.nuxus.app',
    name: 'Nuxus 2.0',
    short_name: 'Nuxus',
    description: 'Суверенный мессенджер с поддержкой ИИ и квантовой защитой.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#010103',
    theme_color: '#010103',
    lang: 'ru',
    icons: [
      {
        src: APP_ICON_URL,
        sizes: '192x192',
        type: 'image/jpeg',
        purpose: 'any'
      },
      {
        src: APP_ICON_URL,
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'any'
      }
    ],
  }
}
