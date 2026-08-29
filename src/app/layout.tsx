
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { SovereignProvider } from '@/components/sovereign-provider';

const font = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
  preload: true,
});

export const metadata: Metadata = {
  title: 'Nuxus 5.9.0',
  description: 'Premium communication terminal.',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`dark ${font.variable}`} suppressHydrationWarning>
      <body className="bg-[#010103] text-foreground antialiased overflow-hidden selection:bg-primary/30">
        <SovereignProvider>
          {children}
        </SovereignProvider>
      </body>
    </html>
  );
}
