
'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from './provider';

/**
 * NUXUS ACTIVATOR V14.0
 * ИСПРАВЛЕНО: Полное устранение Hydration Mismatch. 
 * Загрузочный экран теперь идентичен на SSR и Client.
 */
export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Первоначальный рендер (SSR и первый проход Client)
  // ВАЖНО: Классы и структура должны быть СТРОГО идентичны
  if (!mounted) {
    return (
      <div className="fixed inset-0 z-[10000] bg-[#020205] flex flex-col items-center justify-center gap-6">
         <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
         <p className="text-[9px] font-black uppercase text-primary/40 tracking-[0.4em]">Origin Engine V14</p>
      </div>
    );
  }

  return (
    <FirebaseProvider>
      {children}
    </FirebaseProvider>
  );
}
