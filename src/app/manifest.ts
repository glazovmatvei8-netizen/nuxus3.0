
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  /**
   * ИКОНКА ДЛЯ МАНИФЕСТА (v45)
   */
  const APP_ICON_URL = 'https://i.ibb.co/sd2MqGz2/Icon.png?v=45';
  
  return {
    id: 'chat.nuxus.app',
    name: 'Nuxus 2.0',
    short_name: 'Nuxus',
    description: 'Современный мессенджер с поддержкой ИИ, защитой 2FA и видеозвонками.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'tabbed', 'standalone', 'minimal-ui'],
    background_color: '#0a0a0c',
    theme_color: '#0a0a0c',
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
        name: 'Новый чат',
        short_name: 'Чат',
        description: 'Начать новое обсуждение',
        url: '/?view=chats',
        icons: [{ src: APP_ICON_URL, sizes: '192x192', type: 'image/png' }]
      }
    ],
    related_applications: [],
  }
}
