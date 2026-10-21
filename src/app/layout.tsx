import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SovereignProvider } from '@/components/sovereign-provider';

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
        <script dangerouslySetInnerHTML={{ __html: `
          // 1. ПРИНУДИТЕЛЬНЫЙ HTTPS
          if (location.protocol === 'http:' && location.hostname !== 'localhost') {
            location.href = location.href.replace('http:', 'https:');
          }

          // 2. ЗАЩИТА BLACK BOX (ANTI-F12)
          if (typeof window !== 'undefined') {
            // Блокировка контекстного меню
            document.addEventListener('contextmenu', e => e.preventDefault());

            // Блокировка горячих клавиш
            document.addEventListener('keydown', e => {
              if (
                e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
                (e.ctrlKey && e.key === 'U') ||
                (e.metaKey && e.altKey && e.key === 'I') // для Mac
              ) {
                e.preventDefault();
                alert('NUXUS AEGIS: ДОСТУП К КОДУ ЗАБЛОКИРОВАН');
              }
            });

            // Debugger Trap: Замедляет и мешает работе в консоли
            setInterval(() => {
              (function() {
                const start = new Date();
                debugger;
                const end = new Date();
                if (end - start > 100) {
                   console.clear();
                   console.log('%cSIGNAL INTERCEPTED', 'color: red; font-size: 30px; font-weight: bold;');
                }
              })();
            }, 1000);

            // Очистка консоли
            setInterval(() => {
              console.clear();
              console.log('%c🛰️ NUXUS KERNEL V172.0 ACTIVE', 'color: #E58E38; font-weight: bold; font-size: 14px;');
            }, 2000);
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
