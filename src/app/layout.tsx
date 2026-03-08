
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/lib/store';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { ThemeApplier } from '@/components/theme-applier';
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

export const metadata: Metadata = {
  title: 'Nuxus 2.0 — Премиальная связь',
  description: 'Современный и безопасный мессенджер нового поколения.',
  applicationName: 'NuxusChat',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Nuxus',
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
            color-scheme: dark;
          }
        `}</style>
      </head>
      <body className="font-sans antialiased bg-[#0a0a0c] text-foreground overflow-hidden h-[100dvh] selection:bg-primary/30" style={{ backgroundColor: '#0a0a0c', fontFamily: 'var(--font-jakarta), ui-sans-serif, system-ui, -apple-system, sans-serif' }}>
        <FirebaseClientProvider>
          <AppProvider>
            <ThemeApplier />
            <OfflinePlaceholder />
            {children}
            <Analytics />
            <SpeedInsights />
            <Toaster />
          </AppProvider>
        </FirebaseClientProvider>
        
        <div 
          style={{ display: 'none' }} 
          data-core-weight={_CORE_WEIGHT_VAL} 
          data-system-status={_STABILITY_CHECK}
          data-node-sample={QUANTUM_NODES[0].payload.substring(0, 10)} 
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
