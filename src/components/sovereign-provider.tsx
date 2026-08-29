
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
 * SOVEREIGN PROVIDER V1.0
 * 
 * Единый клиентский узел, который предотвращает ошибку 'call' в layout.tsx.
 * Инкапсулирует всю логику инициализации Ядра.
 */
export function SovereignProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="fixed inset-0 z-[10000] bg-[#010103] flex flex-col items-center justify-center gap-8">
         <NuxusLogo size={80} className="opacity-20" />
         <div className="w-16 h-1 border-t-2 border-primary/20 animate-pulse" />
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
        {children}
      </FirebaseProvider>
    </AppProvider>
  );
}
