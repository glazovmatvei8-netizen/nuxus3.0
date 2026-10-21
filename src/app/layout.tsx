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
            // 1. ANTI-CLONE & DOMAIN LOCK (NUXUS OFFICIAL NODES)
            const allowedDomains = [
              'nuxus.fun', 
              'chat.nuxus.fun', 
              'www.nuxus.fun', 
              'localhost', 
              '127.0.0.1', 
              'web.app', 
              'firebaseapp.com', 
              'swtest.ru',
              'beget.tech'
            ];
            
            if (typeof window !== 'undefined') {
              const isDomainAllowed = allowedDomains.some(d => location.hostname.endsWith(d));
              if (!isDomainAllowed) {
                document.documentElement.innerHTML = '<body style="background:#000;color:red;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-transform:uppercase;text-align:center;padding:20px;"><div><h1>Access Denied</h1><p>Illegal Nuxus Kernel Clone Detected.</p><p style="font-size:10px;color:#333;">Node Identity Conflict at ' + location.hostname + '</p></div></body>';
                return;
              }

              // 2. ANTI-IFRAME (FRAME BUSTER)
              if (window.self !== window.top) {
                window.top.location.href = window.self.location.href;
              }

              // 3. NUCLEAR DEBUGGER TRAP (Recursive Time-Delta)
              const trap = function() {
                const start = Date.now();
                debugger;
                const end = Date.now();
                // Если разница больше 50мс - значит консоль открыта и сработал брейкпоинт
                if (end - start > 50) {
                  window.location.href = 'about:blank';
                }
                setTimeout(trap, 100);
              };
              
              setTimeout(trap, 500);

              // 4. BLOCK SYSTEM INPUTS
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

              // 5. DOM TAMPER DETECTION
              const observer = new MutationObserver((mutations) => {
                // Если кто-то пытается удалить защитные скрипты или инжектить код
                for (const mutation of mutations) {
                  if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
                     // Можно добавить логику самоуничтожения сессии
                     console.clear();
                  }
                }
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
