
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/lib/store';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { ThemeApplier } from '@/components/theme-applier';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Script from 'next/script';

const font = Plus_Jakarta_Sans({
  subsets: ['latin'],
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
        <style>{`
          html, body { 
            background-color: #0a0a0c !important; 
            margin: 0; 
            padding: 0;
            overflow: hidden;
          }
        `}</style>
      </head>
      <body 
        className="font-sans antialiased bg-[#0a0a0c] text-foreground overflow-hidden h-[100dvh] selection:bg-primary/30" 
        style={{ 
          backgroundColor: '#0a0a0c',
          fontFamily: 'var(--font-jakarta), ui-sans-serif, system-ui, -apple-system, sans-serif'
        }}
      >
        <FirebaseClientProvider>
          <AppProvider>
            <ThemeApplier />
            {children}
            <Toaster />
          </AppProvider>
        </FirebaseClientProvider>
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(function(reg) {
                  console.log('Nuxus Ghost Protocol: Active');
                }).catch(function(err) {
                  console.log('Nuxus Ghost Protocol: Failed');
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
