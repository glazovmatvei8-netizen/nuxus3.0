
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SovereignProvider } from '@/components/sovereign-provider';

const font = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
  preload: true,
});

export const metadata: Metadata = {
  title: 'Nuxus 2.0 — Sovereign Node',
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
 * ROOT LAYOUT V67.0 «SOVEREIGN REDESIGN»
 * 
 * ПОЛНЫЙ ФИКС ОШИБКИ 'call':
 * Все клиентские провайдеры вынесены в SovereignProvider.
 * Layout теперь — чистый серверный компонент без зависимостей от Firebase.
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
        <SovereignProvider>
          <main className="relative h-[100dvh] w-full overflow-hidden">
            {children}
          </main>
          <Analytics />
          <SpeedInsights />
        </SovereignProvider>
      </body>
    </html>
  );
}
