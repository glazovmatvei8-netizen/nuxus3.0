
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nuxus — Премиальный мессенджер',
    short_name: 'Nuxus',
    description: 'Современный мессенджер с поддержкой AI и видеосообщений.',
    start_url: '/',
    display: 'standalone',
    background_color: '#1a1b26',
    theme_color: '#3b4261',
    lang: 'ru',
    icons: [
      {
        src: 'https://picsum.photos/seed/nuxus/192/192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: 'https://picsum.photos/seed/nuxus/512/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
    ],
  }
}
