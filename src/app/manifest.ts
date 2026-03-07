
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nuxus — Премиальный мессенджер',
    short_name: 'Nuxus',
    description: 'Современный мессенджер с поддержкой AI и видеосообщений.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0c',
    theme_color: '#0a0a0c',
    lang: 'ru',
    orientation: 'portrait',
    icons: [
      {
        src: 'https://picsum.photos/seed/nuxus-prime-core-v5/192/192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: 'https://picsum.photos/seed/nuxus-prime-core-v5/512/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
    ],
    shortcuts: [
      {
        name: "Чаты",
        url: "/",
        description: "Открыть список чатов"
      },
      {
        name: "Контакты",
        url: "/",
        description: "Поиск контактов"
      }
    ],
    categories: ["communications", "social"],
    screenshots: [
      {
        src: "https://picsum.photos/seed/nuxus-shot/1170/2532",
        sizes: "1170x2532",
        type: "image/png",
        label: "Nuxus Interface"
      }
    ]
  }
}
