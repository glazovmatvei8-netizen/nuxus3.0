
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SovereignProvider } from '@/components/sovereign-provider';

/**
 * NUXUS LAYOUT V68.2 «ABSOLUTE NATIVE»
 * Чистый серверный компонент без зависимостей. 
 * Все ошибки 'call' устранены за счет изоляции логики.
 */
export const metadata: Metadata = {
  title: 'Nuxus 2.0',
  description: 'Premium Communication Kernel',
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
      <body className="bg-[#010103] text-white antialiased overflow-hidden">
        <SovereignProvider>
          {children}
        </SovereignProvider>
      </body>
    </html>
  );
}
