
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/lib/store';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { ThemeApplier } from '@/components/theme-applier';
import { AppIconApplier } from '@/components/app-icon-applier';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from 'next/script';
import { QUANTUM_NODES, getCoreWeight } from '@/lib/quantum-core-data';
import { OfflinePlaceholder } from '@/components/offline-placeholder';

const font = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
});

const _CORE_WEIGHT_VAL = getCoreWeight();
const _STABILITY_CHECK = QUANTUM_NODES.length > 0 ? 'HYPER_STABLE' : 'ERROR';

/**
 * ГЛОБАЛЬНАЯ ИКОНКА NUXUS (v16)
 * Ваша основная иконка: https://i.ibb.co/sd2MqGz2/Icon.png
 */
const APP_ICON_URL = 'https://i.ibb.co/sd2MqGz2/Icon.png';
const VERSION_PARAM = '?v=16';
const FINAL_ICON_URL = `${APP_ICON_URL}${VERSION_PARAM}`;

export const metadata: Metadata = {
  title: 'Nuxus 2.0 — Премиальная связь',
  description: 'Современный и безопасный мессенджер нового поколения.',
  applicationName: 'NuxusChat',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Nuxus',
  },
  icons: {
    icon: [
      { url: FINAL_ICON_URL, sizes: '16x16', type: 'image/png' },
      { url: FINAL_ICON_URL, sizes: '32x32', type: 'image/png' },
      { url: FINAL_ICON_URL, sizes: '192x192', type: 'image/png' },
      { url: FINAL_ICON_URL, sizes: '512x512', type: 'image/png' },
    ],
    shortcut: { url: FINAL_ICON_URL, type: 'image/png' },
    apple: [
      { url: FINAL_ICON_URL, sizes: '180x180', type: 'image/png' },
    ],
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
        <link rel="icon" type="image/png" sizes="16x16" href={FINAL_ICON_URL} />
        <link rel="icon" type="image/png" sizes="32x32" href={FINAL_ICON_URL} />
        <link rel="icon" type="image/png" sizes="192x192" href={FINAL_ICON_URL} />
        <link rel="shortcut icon" type="image/png" href={FINAL_ICON_URL} />
        <link rel="apple-touch-icon" href={FINAL_ICON_URL} />
        
        <style>
          {`
          html, body { 
            background-color: #0a0a0c !important; 
            margin: 0; 
            padding: 0;
            overflow: hidden;
            color-scheme: dark;
          }
        `}
        </style>
      </head>
      <body className="font-sans antialiased bg-[#0a0a0c] text-foreground overflow-hidden h-[100dvh] selection:bg-primary/30" style={{ backgroundColor: '#0a0a0c', fontFamily: 'var(--font-jakarta), ui-sans-serif, system-ui, -apple-system, sans-serif' }}>
        <FirebaseClientProvider>
          <AppProvider>
            <ThemeApplier />
            <AppIconApplier />
            <OfflinePlaceholder />
            {children}
            <Analytics />
            <SpeedInsights />
            <Toaster />
          </AppProvider>
        </FirebaseClientProvider>
        
        <div 
          style={{ display: 'none' }} 
          data-system-status={_STABILITY_CHECK}
        />

        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(function(reg) {
                  console.log('Nuxus Kernel: Service Worker Active');
                }).catch(function(err) {
                  console.log('Nuxus Kernel: Service Worker Failed', err);
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
