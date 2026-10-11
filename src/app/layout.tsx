
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SovereignProvider } from '@/components/sovereign-provider';

/**
 * NUXUS LAYOUT V118.0 «ABSOLUTE SEO & IDENTITY»
 * UPDATED: Hard reset for favicon and apple-touch-icons to use IMG-2541.jpg.
 */
const ICON_URL = 'https://i.postimg.cc/T2xvz0mn/IMG-2541.jpg?v=118';

export const metadata: Metadata = {
  title: 'Nuxus 2.0 — Суверенное Ядро Связи',
  description: 'Безопасный мессенджер с квантовым шифрованием QES, системой авторского права и абсолютной приватностью. Все права принадлежат Nuxus.',
  keywords: ['Nuxus', 'Messenger', 'Privacy', 'Encryption', 'AI Chat', 'Sovereign Network'],
  authors: [{ name: 'Nuxus Team' }],
  metadataBase: new URL('https://nuxus.fun'),
  openGraph: {
    title: 'Nuxus 2.0 — Суверенное Ядро Связи',
    description: 'Безопасный мессенджер нового поколения. Защита данных на уровне Ядра. © Nuxus 2024.',
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
    description: 'Quantum Encryption Signal Messenger. © Nuxus.',
    images: ['https://i.postimg.cc/T2xvz0mn/IMG-2541.jpg'],
  },
  icons: {
    icon: ICON_URL,
    shortcut: ICON_URL,
    apple: ICON_URL,
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
