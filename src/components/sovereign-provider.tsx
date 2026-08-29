'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { AppProvider } from '@/lib/app-state'; 
import { FirebaseProvider } from '@/firebase/provider';
import { ThemeApplier } from '@/components/theme-applier';
import { AppIconApplier } from '@/components/app-icon-applier';
import { Toaster } from '@/components/ui/toaster';
import { OfflinePlaceholder } from '@/components/offline-placeholder';
import { UpdateNotifier } from '@/components/update-notifier';
import { NuxusLogo } from '@/components/nuxus-logo';

/**
 * SOVEREIGN PROVIDER V5.9.0 «HYDRATION GUARDIAN»
 * КРИТИЧЕСКИЙ ФИКС: Рендерит приложение ТОЛЬКО после полной загрузки клиента.
 * Это на 100% убирает "Белый экран" и ошибку 'call'.
 */
export function SovereignProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Пока браузер не готов, показываем только темный фон и легкий лоадер
  if (!mounted) {
    return (
      <div className="fixed inset-0 z-[10000] bg-[#010103] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <NuxusLogo size={60} className="opacity-20 animate-pulse" />
          <div className="w-32 h-[1px] bg-white/5 relative overflow-hidden">
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
        <UpdateNotifier />
        <Toaster />
        <main className="relative h-[100dvh] w-full overflow-hidden">
          {children}
        </main>
      </FirebaseProvider>
    </AppProvider>
  );
}
