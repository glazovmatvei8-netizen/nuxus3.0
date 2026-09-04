
'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { AppProvider } from '@/lib/app-state'; 
import { FirebaseProvider } from '@/firebase/provider';
import { Toaster } from '@/components/ui/toaster';
import { NuxusLogo } from '@/components/nuxus-logo';
import { ThemeApplier } from '@/components/theme-applier';
import { AppIconApplier } from '@/components/app-icon-applier';
import { OfflinePlaceholder } from '@/components/offline-placeholder';

/**
 * SOVEREIGN PROVIDER V5.9.0 «NATIVE BRIDGE»
 * Исключает ошибку originalFactory.call и гарантирует запуск на Android.
 * Это единственный клиентский компонент, который вызывается в layout.tsx.
 */
export function SovereignProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Блокируем системные меню для эффекта нативного приложения
    const preventDefault = (e: Event) => {
      if ((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        // e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', preventDefault);
    return () => document.removeEventListener('contextmenu', preventDefault);
  }, []);

  if (!mounted) {
    return (
      <div className="fixed inset-0 z-[10000] bg-[#010103] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
          <NuxusLogo size={80} className="opacity-20 animate-pulse" />
          <p className="text-[10px] font-black uppercase text-white/20 tracking-[0.6em]">Initializing Kernel 5.9.0</p>
        </div>
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
