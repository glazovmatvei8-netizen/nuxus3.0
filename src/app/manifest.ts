
import { MetadataRoute } from 'next'

export default function manifest(): any {
  return {
    id: 'chat.nuxus.app',
    name: 'Nuxus — Премиальный мессенджер',
    short_name: 'Nuxus',
    description: 'Современный мессенджер с поддержкой AI, защитой 2FA и видеозвонками. Ваше персональное ядро общения.',
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
    iarc_rating_id: 'e836224e-749e-4a6c-94f4-526b47a1990c',
    prefer_related_applications: false,
    related_applications: [
      {
        platform: 'play',
        url: 'https://play.google.com/store/apps/details?id=chat.nuxus.app',
        id: 'chat.nuxus.app'
      }
    ],
    scope_extensions: [
      { origin: 'https://studio-5946432351-bbd5e.web.app' }
    ],
    protocol_handlers: [
      {
        protocol: 'web+nuxus',
        url: '/?uri=%s'
      }
    ],
    share_target: {
      action: '/?share',
      method: 'GET',
      params: {
        title: 'title',
        text: 'text',
        url: 'url'
      }
    },
    edge_side_panel: {
      preferred_width: 480
    },
    shortcuts: [
      {
        name: 'Новый чат',
        short_name: 'Чат',
        description: 'Начать новое обсуждение',
        url: '/?view=chats',
        icons: [{ src: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=192&h=192&fit=crop&fm=png', sizes: '192x192', type: 'image/png' }]
      }
    ],
    file_handlers: [
      {
        action: '/',
        accept: {
          'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
          'application/pdf': ['.pdf']
        }
      }
    ],
    launch_handler: {
      client_mode: 'focus-existing'
    },
    note_taking: {
      new_note_url: '/?view=chats&new=note'
    },
    icons: [
      {
        src: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=192&h=192&fit=crop&fm=png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=512&h=512&fit=crop&fm=png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      }
    ]
  }
}
