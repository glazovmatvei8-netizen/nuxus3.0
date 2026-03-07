
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
    prefer_related_applications: false,
    icons: [
      {
        src: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=192&h=192&fit=crop&fm=png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=192&h=192&fit=crop&fm=png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=512&h=512&fit=crop&fm=png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=512&h=512&fit=crop&fm=png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
    screenshots: [
      {
        src: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=1080&h=1920&fit=crop&fm=png',
        sizes: '1080x1920',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Интерфейс чата Nuxus'
      },
      {
        src: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=1920&h=1080&fit=crop&fm=png',
        sizes: '1920x1080',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Десктопная версия Nuxus'
      }
    ]
  }
}
