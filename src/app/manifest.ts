
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  /**
   * ИКОНКА ДЛЯ МАНИФЕСТА (Android / PWA)
   * Должна совпадать с той, что в layout.tsx
   */
  const APP_ICON_URL = 'https://picsum.photos/seed/nuxus-app-final-v3/512/512';
  
  return {
    id: 'chat.nuxus.app',
    name: 'Nuxus — Премиальная связь',
    short_name: 'Nuxus',
    description: 'Современный мессенджер с поддержкой ИИ, защитой 2FA и видеозвонками. Ваше персональное ядро общения.',
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
    ]
  }
}
