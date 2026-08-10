
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
import { OfflinePlaceholder } from '@/components/offline-placeholder';
import { BiometricGate } from '@/components/biometric-gate';
import { GlobalModalsWrapper } from '@/components/global-modals-wrapper';

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
      <body 
        className="font-sans antialiased bg-background text-foreground overflow-hidden h-[100dvh] selection:bg-primary/30" 
        style={{ fontFamily: 'var(--font-jakarta), ui-sans-serif, system-ui, -apple-system, sans-serif' }}
        suppressHydrationWarning
      >
        <AppProvider>
          <FirebaseClientProvider>
            <ThemeApplier />
            <AppIconApplier />
            <OfflinePlaceholder />
            <BiometricGate>
              {children}
            </BiometricGate>
            <GlobalModalsWrapper />
            <Analytics />
            <SpeedInsights />
            <Toaster />
          </FirebaseClientProvider>
        </AppProvider>

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
