
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  const APP_ICON_URL = 'https://picsum.photos/seed/nuxus-app-final-v2/512/512';
  
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
    ],
    screenshots: [
      {
        src: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=1080&h=1920&fit=crop&fm=png',
        sizes: '1080x1920',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Интерфейс мессенджера'
      }
    ]
  }
}
