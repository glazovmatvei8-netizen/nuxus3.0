import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/lib/store.tsx'; 
import { FirebaseClientProvider } from '@/firebase/client-provider.tsx';
import { ThemeApplier } from '@/components/theme-applier.tsx';
import { AppIconApplier } from '@/components/app-icon-applier.tsx';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from 'next/script';
import { OfflinePlaceholder } from '@/components/offline-placeholder.tsx';
import { BiometricGate } from '@/components/biometric-gate.tsx';
import { GlobalModalsWrapper } from '@/components/global-modals-wrapper.tsx';
import { Toaster } from '@/components/ui/toaster.tsx';

const font = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
  preload: true,
});

const FINAL_ICON_URL = 'https://i.ibb.co/sd2MqGz2/Icon.png?v=45';

export const metadata: Metadata = {
  title: 'Nuxus 2.0 — Absolute Zero',
  description: 'Premium hyper-quantum communication kernel.',
  applicationName: 'Nuxus',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Nuxus',
    startupImage: FINAL_ICON_URL,
  },
  icons: {
    icon: [
      { url: FINAL_ICON_URL, sizes: '512x512', type: 'image/png' },
    ],
    shortcut: FINAL_ICON_URL,
    apple: FINAL_ICON_URL,
  }
};

export const viewport: Viewport = {
  themeColor: '#020205',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

/**
 * ROOT LAYOUT V22.0 «ABSOLUTE ZERO»
 * 
 * ПОЛНОЕ ИСПРАВЛЕНО: Убраны все циклические импорты.
 * Прямые ссылки на файлы исключают ошибку 'call'.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`dark ${font.variable}`} suppressHydrationWarning>
      <body 
        className="font-sans antialiased bg-[#020205] text-foreground overflow-hidden h-[100dvh] select-none" 
        style={{ fontFamily: 'var(--font-jakarta), ui-sans-serif, system-ui, -apple-system, sans-serif' }}
      >
        <AppProvider>
          <FirebaseClientProvider>
            <ThemeApplier />
            <AppIconApplier />
            <OfflinePlaceholder />
            <BiometricGate>
              <main className="relative h-[100dvh] w-full overflow-hidden">
                {children}
              </main>
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
                   console.log('Nuxus Engine: Active');
                }).catch(function() {
                   // fail silently
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
