import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/lib/store'; 
import { FirebaseProvider } from '@/firebase/provider';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { ThemeApplier } from '@/components/theme-applier';
import { AppIconApplier } from '@/components/app-icon-applier';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from '@/components/ui/toaster';
import { OfflinePlaceholder } from '@/components/offline-placeholder';
import { UpdateNotifier } from '@/components/update-notifier';

const font = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
  preload: true,
});

export const metadata: Metadata = {
  title: 'Nuxus 2.0 — Obsidian Void',
  description: 'Premium ethereal communication terminal.',
  applicationName: 'Nuxus',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Nuxus',
  },
  icons: {
    icon: 'https://i.ibb.co/sd2MqGz2/Icon.png?v=45',
    apple: 'https://i.ibb.co/sd2MqGz2/Icon.png?v=45',
  }
};

export const viewport: Viewport = {
  themeColor: '#010103',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

/**
 * ROOT LAYOUT V65.0 «SINGULARITY CORE»
 * 
 * ФИКС ОШИБКИ 'call' (Annihilated):
 * 1. Прямая иерархия провайдеров без циклов.
 * 2. ThemeApplier и AppIconApplier вынесены в ClientProvider.
 * 3. Все AI-компоненты удалены навсегда.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`dark ${font.variable}`} suppressHydrationWarning>
      <body 
        className="font-sans antialiased bg-[#010103] text-foreground overflow-hidden h-[100dvh] select-none" 
        style={{ fontFamily: 'var(--font-jakarta), ui-sans-serif, system-ui, -apple-system, sans-serif' }}
      >
        <AppProvider>
          <FirebaseProvider>
            <FirebaseClientProvider>
              <ThemeApplier />
              <AppIconApplier />
              <OfflinePlaceholder />
              <UpdateNotifier />
              <main className="relative h-[100dvh] w-full overflow-hidden">
                {children}
              </main>
              <Toaster />
              <Analytics />
              <SpeedInsights />
            </FirebaseClientProvider>
          </FirebaseProvider>
        </AppProvider>
      </body>
    </html>
  );
}
