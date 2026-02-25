
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NuxusChat',
    short_name: 'NuxusChat',
    description: 'Premium messaging experience',
    start_url: '/',
    display: 'standalone',
    background_color: '#1a1b26',
    theme_color: '#3b4261',
    icons: [
      {
        src: 'https://picsum.photos/seed/nuxus/192/192',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: 'https://picsum.photos/seed/nuxus/512/512',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
