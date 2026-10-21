
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
            // 1. DOMAIN LOCK & ANTI-CLONE
            const allowed = ['nuxus.fun', 'chat.nuxus.fun', 'www.nuxus.fun', 'localhost', 'swtest.ru', 'firebaseapp.com', 'web.app'];
            if (typeof window !== 'undefined') {
              const h = window.location.hostname;
              const isNative = !!(window.Capacitor || window.webkit || window.android);
              if (!allowed.some(d => h.endsWith(d)) && !isNative) {
                document.documentElement.innerHTML = '<body style="background:#000;color:red;display:flex;text-align:center;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><h1>ACCESS DENIED: ILLEGAL NODE CLONE</h1></body>';
                return;
              }

              // 2. NUCLEAR DEBUGGER TRAP (IMPROVED)
              const trap = function() {
                const s = Date.now();
                debugger;
                if (Date.now() - s > 100 && !isNative) {
                  // Если отладчик открыт - забиваем консоль мусором и выходим
                  for(let i=0; i<1000; i++) console.log(new Array(1000).fill("AEGIS_TRAP"));
                  window.location.href = 'about:blank';
                }
                setTimeout(trap, 200);
              };
              if (!isNative) setTimeout(trap, 2000);

              // 3. BLOCK INSPECTION
              document.addEventListener('contextmenu', e => e.preventDefault());
              document.addEventListener('keydown', e => {
                if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key)) || (e.ctrlKey && e.key === 'U')) {
                  e.preventDefault();
                  return false;
                }
              });

              // 4. FORCE HTTPS
              if (window.location.protocol === 'http:' && !h.includes('localhost') && !isNative) {
                window.location.href = 'https:' + window.location.href.substring(5);
              }
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
