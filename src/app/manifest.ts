import { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  const APP_ICON_URL = 'https://i.postimg.cc/T2xvz0mn/IMG-2541.jpg?v=118';
  
  return {
    id: 'chat.mig.app',
    name: 'MIG 2.0',
    short_name: 'MIG',
    description: 'Сверхзвуковой мессенджер с квантовой защитой. © MIG Platform.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#010103',
    theme_color: '#00D4FF',
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
