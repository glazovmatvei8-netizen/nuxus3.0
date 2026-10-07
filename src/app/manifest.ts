import { MetadataRoute } from 'next'

/**
 * КРИТИЧЕСКИЙ ФИКС ДЛЯ СТАТИЧЕСКОГО ЭКСПОРТА (IPA/RU-HOSTING)
 * Принудительно переводит манифест в статический режим.
 */
export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  /**
   * ИКОНКА ДЛЯ МАНИФЕСТА (v45) - АБСОЛЮТ
   */
  const APP_ICON_URL = 'https://i.ibb.co/sd2MqGz2/Icon.png?v=45';
  
  return {
    id: 'chat.nuxus.app',
    name: 'Nuxus 2.0',
    short_name: 'Nuxus',
    description: 'Суверенный мессенджер с поддержкой ИИ и квантовой защитой.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'tabbed', 'standalone', 'minimal-ui'],
    background_color: '#010103',
    theme_color: '#010103',
    lang: 'ru',
    dir: 'ltr',
    orientation: 'portrait',
    categories: ['social', 'communication', 'productivity'],
    prefer_related_applications: false,
    icons: [
      {
        src: APP_ICON_URL,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: APP_ICON_URL,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: APP_ICON_URL,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
    shortcuts: [
      {
        name: 'Чаты',
        short_name: 'Чаты',
        description: 'Открыть список диалогов',
        url: '/?view=chats',
        icons: [{ src: APP_ICON_URL, sizes: '192x192', type: 'image/png' }]
      }
    ],
    related_applications: [],
  }
}
