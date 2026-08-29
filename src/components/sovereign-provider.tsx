
'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { AppProvider } from '@/lib/app-state'; 
import { FirebaseProvider } from '@/firebase/provider';
import { Toaster } from '@/components/ui/toaster';
import { OfflinePlaceholder } from '@/components/offline-placeholder';
import { NuxusLogo } from '@/components/nuxus-logo';
import { ThemeApplier } from '@/components/theme-applier';
import { AppIconApplier } from '@/components/app-icon-applier';

/**
 * SOVEREIGN PROVIDER V5.9.0 «TITANIUM SHIELD»
 * Глобальный узел инициализации. Устраняет белый экран и ошибки Webpack.
 * ИСПРАВЛЕНО: Удален UpdateNotifier, чтобы не беспокоить пользователей RuStore.
 */
export function SovereignProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Ждем полной готовности DOM и Window перед рендерингом клиентских провайдеров
    setMounted(true);
  }, []);

  // Состояние до гидратации: Защита от originalFactory.call и ошибок Webpack
  if (!mounted) {
    return (
      <div className="fixed inset-0 z-[10000] bg-[#010103] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
          <NuxusLogo size={80} className="opacity-20 animate-pulse" />
          <div className="w-32 h-[1px] bg-white/5 relative overflow-hidden rounded-full">
             <div className="absolute inset-0 bg-primary/40 translate-x-[-100%] animate-[shimmer_2s_infinite]" />
          </div>
        </div>
        <style jsx global>{`
          @keyframes shimmer {
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <AppProvider>
      <FirebaseProvider>
        <ThemeApplier />
        <AppIconApplier />
        <OfflinePlaceholder />
        <Toaster />
        <main className="relative h-[100dvh] w-full overflow-hidden bg-[#010103]">
          {children}
        </main>
      </FirebaseProvider>
    </AppProvider>
  );
}
