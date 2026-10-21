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
          (function() {
            // 1. ANTI-CLONE & DOMAIN LOCK
            const allowedDomains = ['nuxus.fun', 'localhost', '127.0.0.1', 'web.app', 'firebaseapp.com', 'swtest.ru'];
            if (typeof window !== 'undefined') {
              const isDomainAllowed = allowedDomains.some(d => location.hostname.includes(d));
              if (!isDomainAllowed) {
                document.documentElement.innerHTML = '<body style="background:#000;color:red;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-transform:uppercase;text-align:center;"><h1>Access Denied</h1><p>Illegal Nuxus Kernel Clone Detected.</p></body>';
                return;
              }

              // 2. ANTI-IFRAME
              if (window.self !== window.top) {
                window.top.location.href = window.self.location.href;
              }

              // 3. NUCLEAR DEBUGGER TRAP (Recursive)
              const trap = function() {
                const start = Date.now();
                debugger;
                const end = Date.now();
                if (end - start > 50) {
                  window.location.href = 'about:blank';
                }
                setTimeout(trap, 100);
              };
              
              // Запуск ловушки с небольшой задержкой
              setTimeout(trap, 500);

              // 4. BLOCK INPUTS
              document.addEventListener('contextmenu', e => e.preventDefault());
              document.addEventListener('keydown', e => {
                if (
                  e.key === 'F12' || 
                  (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || 
                  (e.ctrlKey && (e.key === 'U' || e.key === 'S')) ||
                  (e.metaKey && e.optionKey && e.key === 'i')
                ) {
                  e.preventDefault();
                  return false;
                }
              });

              // 5. TAMPER DETECTION (Observer)
              const observer = new MutationObserver(() => {
                // Если кто-то пытается удалить защитные элементы или менять структуру
                console.clear();
              });
              observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
            }
          })();
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
