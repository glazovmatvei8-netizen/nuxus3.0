
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SovereignProvider } from '@/components/sovereign-provider';

/**
 * NUXUS LAYOUT V116.0 «ABSOLUTE SEO & IDENTITY»
 * UPDATED: Added OpenGraph and Twitter meta tags for perfect link previews.
 */
export const metadata: Metadata = {
  title: 'Nuxus 2.0 — Суверенное Ядро Связи',
  description: 'Премиальный мессенджер с квантовым шифрованием QES, ИИ-узлами и абсолютной приватностью. Ваше общение под вашей защитой.',
  keywords: ['Nuxus', 'Messenger', 'Privacy', 'Encryption', 'AI Chat', 'Sovereign Network'],
  authors: [{ name: 'Nuxus Team' }],
  openGraph: {
    title: 'Nuxus 2.0 — Суверенное Ядро Связи',
    description: 'Безопасный мессенджер нового поколения. Защита данных на уровне Ядра.',
    url: 'https://nuxus.fun',
    siteName: 'Nuxus Core',
    images: [
      {
        url: 'https://i.postimg.cc/T2xvz0mn/IMG-2541.jpg',
        width: 1024,
        height: 1024,
        alt: 'Nuxus Identity Core',
      },
    ],
    locale: 'ru_RU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nuxus 2.0',
    description: 'Quantum Encryption Signal Messenger.',
    images: ['https://i.postimg.cc/T2xvz0mn/IMG-2541.jpg'],
  },
  icons: {
    icon: 'https://i.postimg.cc/T2xvz0mn/IMG-2541.jpg',
    apple: 'https://i.postimg.cc/T2xvz0mn/IMG-2541.jpg',
  }
};

export const viewport: Viewport = {
  themeColor: '#010103',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-[#010103] text-white antialiased overflow-hidden select-none">
        <SovereignProvider>
          {children}
        </SovereignProvider>
      </body>
    </html>
  );
}
