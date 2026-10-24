import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SovereignProvider } from '@/components/sovereign-provider';

const ICON_URL = 'https://i.postimg.cc/T2xvz0mn/IMG-2541.jpg?v=170';

export const metadata: Metadata = {
  title: 'MIG — Сверхзвуковое Ядро Связи',
  description: 'Безопасный мессенджер со скоростью звука и квантовой защитой. © MIG 2024.',
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
            // MIG AEGIS: PREVIEW COMPATIBILITY PROTOCOL
            const allowed = ['nuxus.fun', 'chat.nuxus.fun', 'www.nuxus.fun', 'localhost', 'swtest.ru', 'firebaseapp.com', 'web.app'];
            if (typeof window !== 'undefined') {
              const h = window.location.hostname;
              const isNative = !!(window.Capacitor || window.webkit || window.android);
              const isPreview = h.includes('firebaseapp') || h.includes('web.app') || h.includes('localhost');

              // Only block if NOT a preview and NOT an allowed domain
              if (!allowed.some(d => h.endsWith(d)) && !isNative && !isPreview) {
                document.documentElement.innerHTML = '<body style="background:#000;color:#00D4FF;display:flex;text-align:center;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;padding:20px;"><div><h1>ACCESS DENIED</h1><p>ILLEGAL MIG NODE CLONE DETECTED</p></div></body>';
                return;
              }

              // Stealth Trap: Disabled in preview for developer comfort
              if (!isPreview && !isNative) {
                const trap = function() {
                  const s = Date.now();
                  debugger;
                  if (Date.now() - s > 100) {
                    window.location.href = 'about:blank';
                  }
                  setTimeout(trap, 1000);
                };
                setTimeout(trap, 5000);
              }

              // Global Event Locks
              document.addEventListener('contextmenu', e => e.preventDefault());
              document.addEventListener('keydown', e => {
                if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key))) {
                  if (!isPreview) e.preventDefault();
                }
              });
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