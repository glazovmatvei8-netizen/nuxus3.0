
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: 'chat.nuxus.app',
    name: 'Nuxus — Премиальный мессенджер',
    short_name: 'Nuxus',
    description: 'Современный мессенджер с поддержкой AI, защитой 2FA и видеозвонками. Ваше персональное ядро общения.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
    background_color: '#0a0a0c',
    theme_color: '#0a0a0c',
    lang: 'ru',
    dir: 'ltr',
    orientation: 'portrait',
    categories: ['social', 'communication', 'productivity'],
    iarc_rating_id: 'e836224e-749e-4a6c-94f4-526b47a1990c',
    related_applications: [
      {
        platform: 'play',
        url: 'https://play.google.com/store/apps/details?id=chat.nuxus.app',
        id: 'chat.nuxus.app'
      }
    ],
    scope_extensions: [
      { origin: 'studio-5946432351-bbd5e.web.app' },
      { origin: 'studio-5946432351-bbd5e.firebaseapp.com' }
    ],
    icons: [
      {
        src: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=192&h=192&fit=crop&format=png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=192&h=192&fit=crop&format=png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=512&h=512&fit=crop&format=png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=512&h=512&fit=crop&format=png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      },
    ],
    screenshots: [
      {
        src: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=1080&h=1920&fit=crop&format=png',
        sizes: '1080x1920',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Интерфейс чата Nuxus'
      },
      {
        src: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=1920&h=1080&fit=crop&format=png',
        sizes: '1920x1080',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Десктопная версия Nuxus'
      }
    ],
    shortcuts: [
      {
        name: 'Новое сообщение',
        url: '/',
        icons: [{ src: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=96&h=96&fit=crop&format=png', sizes: '96x96' }]
      }
    ]
  }
}
