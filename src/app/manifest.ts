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
    categories: ['social', 'communication', 'productivity', 'notes'],
    iarc_rating_id: 'e836224e-749e-4a6c-94f4-526b47a1990c',
    prefer_related_applications: false,
    related_applications: [
      {
        platform: 'play',
        url: 'https://play.google.com/store/apps/details?id=chat.nuxus.app',
        id: 'chat.nuxus.app'
      },
      {
        platform: 'itunes',
        url: 'https://apps.apple.com/app/nuxus/idchat.nuxus.app'
      }
    ],
    scope_extensions: [
      { origin: '*.nuxus.chat' },
      { origin: 'studio-5946432351-bbd5e.web.app' }
    ],
    protocol_handlers: [
      {
        protocol: 'web+nuxus',
        url: '/?uri=%s'
      },
      {
        protocol: 'mailto',
        url: '/?mailto=%s'
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
      },
      {
        name: 'Контакты',
        short_name: 'Контакты',
        description: 'Список ваших контактов',
        url: '/?view=contacts',
        icons: [{ src: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=192&h=192&fit=crop&fm=png', sizes: '192x192', type: 'image/png' }]
      }
    ],
    file_handlers: [
      {
        action: '/',
        accept: {
          'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif']
        }
      }
    ],
    launch_handler: {
      client_mode: 'focus-existing'
    },
    note_taking: {
      new_note_url: '/?view=chats&new=note'
    },
    widgets: [
      {
        name: 'Nuxus Status',
        description: 'Быстрый доступ к вашему статусу и непрочитанным сообщениям.',
        tag: 'nuxus_status',
        template: 'nuxus-widget-template',
        ms_ac_template: 'nuxus-adaptive-card-template',
        data: 'nuxus-widget-data',
        type: 'application/json',
        screenshots: [
          {
            src: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=600&h=400&fit=crop&fm=png',
            sizes: '600x400',
            label: 'Nuxus Widget',
            type: 'image/png'
          }
        ]
      }
    ],
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