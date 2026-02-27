
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/lib/store';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Nuxus — Премиальная связь',
  description: 'Современный и безопасный мессенджер для общения в реальном времени с поддержкой AI и видеосообщений.',
  keywords: ['чат', 'мессенджер', 'безопасность', 'AI', 'видеосообщения', 'Nuxus'],
  authors: [{ name: 'Nuxus Team' }],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Nuxus',
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: 'https://nuxus.app',
    title: 'Nuxus — Премиальный опыт общения',
    description: 'Общайтесь красиво и безопасно.',
    siteName: 'Nuxus',
    images: [{
      url: 'https://picsum.photos/seed/nuxus/1200/630',
      width: 1200,
      height: 630,
      alt: 'Nuxus Preview',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nuxus',
    description: 'Премиальный опыт общения.',
    images: ['https://picsum.photos/seed/nuxus/1200/630'],
  },
};

export const viewport: Viewport = {
  themeColor: '#1a1b26',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground overflow-hidden h-[100dvh]">
        <FirebaseClientProvider>
          <AppProvider>
            {children}
            <Toaster />
          </AppProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
