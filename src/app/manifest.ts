import { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  const APP_ICON_URL = 'https://storage.googleapis.com/fetch-studio-images/ed639417-646c-4867-b5cc-74431f0e2ec3.png';
  
  return {
    id: 'chat.mig.app',
    name: 'MIG',
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
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: APP_ICON_URL,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      }
    ],
  }
}
