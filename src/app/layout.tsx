
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SovereignProvider } from '@/components/sovereign-provider';

/**
 * NUXUS LAYOUT V5.9.0 «TITANIUM STABILITY»
 * Layout теперь — это чистый серверный каркас. 
 * Все клиентские функции вынесены в SovereignProvider.
 */
export const metadata: Metadata = {
  title: 'Nuxus 5.9.0',
  description: 'Premium Communication Kernel',
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="bg-[#010103] text-white antialiased overflow-hidden selection:bg-primary/30">
        <SovereignProvider>
          {children}
        </SovereignProvider>
      </body>
    </html>
  );
}
