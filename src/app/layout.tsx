
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SovereignProvider } from '@/components/sovereign-provider';

/**
 * NUXUS LAYOUT V69.0 «ABSOLUTE NATIVE SHELL»
 * Полная изоляция интерфейса для APK/IPA.
 */
export const metadata: Metadata = {
  title: 'Nuxus Native',
  description: 'Premium Communication Kernel for Android & iOS',
};

export const viewport: Viewport = {
  themeColor: '#010103',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover', // Растягиваем на весь экран под челку
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-[#010103] text-white antialiased overflow-hidden select-none">
        <SovereignProvider>
          {children}
        </SovereignProvider>
      </body>
    </html>
  );
}
