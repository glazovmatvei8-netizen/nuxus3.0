
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/lib/store';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Script from 'next/script';

const font = Plus_Jakarta_Sans({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: 'Nuxus — Премиальная связь',
  description: 'Современный и безопасный мессенджер нового поколения.',
  applicationName: 'NuxusChat',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Nuxus',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: 'https://studio-5946432351-bbd5e.web.app/',
    title: 'Nuxus — Технологичное ядро общения',
    description: 'Общайтесь красиво и безопасно.',
    siteName: 'Nuxus',
    images: [{
      url: 'https://picsum.photos/seed/nuxus/1200/630',
      width: 1200,
      height: 630,
      alt: 'Nuxus Preview',
    }],
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0c',
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
    <html lang="ru" className={`dark ${font.variable}`} suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="https://picsum.photos/seed/nuxus/180/180" />
        <link rel="icon" href="https://picsum.photos/seed/nuxus/32/32" />
      </head>
      <body className="font-sans antialiased bg-background text-foreground overflow-hidden h-[100dvh]">
        <FirebaseClientProvider>
          <AppProvider>
            {children}
            <Toaster />
          </AppProvider>
        </FirebaseClientProvider>
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(function(registration) {
                  console.log('Nuxus Core: ServiceWorker Active');
                }).catch(function(err) {
                  console.log('Nuxus Core: SW Registration Failed', err);
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
