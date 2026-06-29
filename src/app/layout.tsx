
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/lib/store';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { ThemeApplier } from '@/components/theme-applier';
import { AppIconApplier } from '@/components/app-icon-applier';
import { VkProvider } from '@/components/vk-provider';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from 'next/script';
import { OfflinePlaceholder } from '@/components/offline-placeholder';
import { BiometricGate } from '@/components/biometric-gate';

const font = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
  preload: true,
});

const FINAL_ICON_URL = 'https://i.ibb.co/sd2MqGz2/Icon.png?v=45';

export const metadata: Metadata = {
  title: 'Nuxus 2.0 — Премиальная связь',
  description: 'Современный и безопасный мессенджер нового поколения.',
  applicationName: 'Nuxus',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Nuxus',
    startupImage: FINAL_ICON_URL,
  },
  icons: {
    icon: [
      { url: FINAL_ICON_URL, sizes: '16x16', type: 'image/png' },
      { url: FINAL_ICON_URL, sizes: '32x32', type: 'image/png' },
      { url: FINAL_ICON_URL, sizes: '192x192', type: 'image/png' },
      { url: FINAL_ICON_URL, sizes: '512x512', type: 'image/png' },
    ],
    shortcut: FINAL_ICON_URL,
    apple: FINAL_ICON_URL,
  },
  other: {
    'msapplication-TileColor': '#0a0a0c',
    'msapplication-config': 'none',
    'notification-app-id': 'chat.nuxus.app',
    'mobile-web-app-capable': 'yes',
    'format-detection': 'telephone=no'
  }
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
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://i.ibb.co" />
        <link rel="preconnect" href="https://ipwho.is" />
        <link rel="icon" href={FINAL_ICON_URL} sizes="any" />
        <link rel="apple-touch-icon" href={FINAL_ICON_URL} />
        <link rel="shortcut icon" href={FINAL_ICON_URL} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <Script src="https://unpkg.com/@vkontakte/vk-bridge/dist/browser.min.js" strategy="beforeInteractive" />
      </head>
      <body 
        className="font-sans antialiased bg-background text-foreground overflow-hidden h-[100dvh] selection:bg-primary/30" 
        style={{ fontFamily: 'var(--font-jakarta), ui-sans-serif, system-ui, -apple-system, sans-serif' }}
        suppressHydrationWarning
      >
        <FirebaseClientProvider>
          <AppProvider>
            <VkProvider />
            <ThemeApplier />
            <AppIconApplier />
            <OfflinePlaceholder />
            <BiometricGate>
              {children}
            </BiometricGate>
            <Analytics />
            <SpeedInsights />
            <Toaster />
          </AppProvider>
        </FirebaseClientProvider>

        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(function(reg) {
                  console.log('Nuxus Kernel: Active');
                }).catch(function(err) {
                  console.log('Nuxus Kernel: SW Fail', err);
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
