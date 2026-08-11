'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from './provider.tsx';

/**
 * NUXUS ACTIVATOR V21.0 «ABSOLUTE ZERO»
 * 
 * РЕШЕНИЕ ОШИБКИ HYDRATION:
 * Оверлей отрисовывается ПОВЕРХ контента, не меняя структуру дерева Suspense.
 */
export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <FirebaseProvider>
      {/* Основной контент всегда в дереве для константной гидратации */}
      {children}
      
      {/* Загрузочный оверлей */}
      {!mounted && (
        <div className="fixed inset-0 z-[10000] bg-[#020205] flex flex-col items-center justify-center gap-6">
           <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
           <p className="text-[9px] font-black uppercase text-primary/40 tracking-[0.4em]">Quantum Core Syncing</p>
        </div>
      )}
    </FirebaseProvider>
  );
}
