import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SovereignProvider } from '@/components/sovereign-provider';

/**
 * NUXUS LAYOUT V171.0 «ABSOLUTE SECURITY SHELL»
 * UPDATED: Added HTTPS enforcement and Anti-F12 protection scripts.
 */
const ICON_URL = 'https://i.postimg.cc/T2xvz0mn/IMG-2541.jpg?v=170';

export const metadata: Metadata = {
  title: 'Nuxus 2.0 — Суверенное Ядро Связи',
  description: 'Безопасный мессенджер с квантовым шифрованием QES и абсолютной приватностью. © Nuxus 2024.',
  metadataBase: new URL('https://nuxus.fun'),
  icons: {
    icon: ICON_URL,
    shortcut: ICON_URL,
    apple: ICON_URL,
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
    <html lang="ru">
      <head>
        {/* HTTPS Enforcement & Anti-F12 Protection Script */}
        <script dangerouslySetInnerHTML={{ __html: `
          // 1. Enforce HTTPS
          if (location.protocol === 'http:' && location.hostname !== 'localhost') {
            location.href = location.href.replace('http:', 'https:');
          }

          // 2. Anti-F12 / Black Box Protection
          if (typeof window !== 'undefined') {
            document.addEventListener('contextmenu', e => e.preventDefault());
            document.addEventListener('keydown', e => {
              if (
                e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
                (e.ctrlKey && e.key === 'U')
              ) {
                e.preventDefault();
                console.warn('%cNUXUS AEGIS: ACCESS DENIED', 'color: red; font-size: 20px; font-weight: bold;');
              }
            });

            // Kill Console spam
            setInterval(() => {
              console.clear();
              console.log('%c🛰️ NUXUS KERNEL V171.0 ACTIVE', 'color: #E58E38; font-weight: bold; font-size: 14px;');
              console.log('%cBLACK BOX PROTECTION ENABLED', 'color: #666; font-size: 10px;');
            }, 5000);
          }
        ` }} />
      </head>
      <body className="bg-[#010103] text-white antialiased overflow-hidden select-none">
        <SovereignProvider>
          {children}
        </SovereignProvider>
      </body>
    </html>
  );
}
