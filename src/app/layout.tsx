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

          // 2. ЗАЩИТА BLACK BOX (ANTI-F12 & DEBUGGER TRAP)
          if (typeof window !== 'undefined') {
            // Блокировка контекстного меню и горячих клавиш
            document.addEventListener('contextmenu', e => e.preventDefault());
            document.addEventListener('keydown', e => {
              if (
                e.key === 'F12' || 
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || 
                (e.ctrlKey && e.key === 'U') ||
                (e.metaKey && e.optionKey && e.key === 'i') // Mac support
              ) {
                e.preventDefault();
                return false;
              }
            });

            // Циклическая ловушка отладчика (Debugger Trap)
            // Это "вешает" консоль при попытке открытия
            setInterval(() => {
              (function() {
                const start = Date.now();
                debugger;
                const end = Date.now();
                if (end - start > 100) {
                   // Если отладчик сработал (пауза > 100мс), перенаправляем на пустую страницу
                   window.location.href = 'about:blank';
                }
              })();
            }, 500);

            // Защита от изменения DOM (Tamper Detection)
            const observer = new MutationObserver((mutations) => {
              mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || mutation.type === 'attributes') {
                   console.log('%cDOM TAMPERING DETECTED', 'color: red; font-weight: bold;');
                }
              });
            });
            observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
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
