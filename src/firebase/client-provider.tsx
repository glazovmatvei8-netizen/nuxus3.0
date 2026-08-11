'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from './provider';

/**
 * NUXUS HYDRATION SHIELD V26.0
 * 
 * АННИГИЛЯЦИЯ HYDRATION MISMATCH:
 * 1. Структура дерева неизменна между SSR и Client.
 * 2. Загрузочный экран - это Phantom Overlay (не узел DOM, а визуальный слой).
 */
export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return (
    <FirebaseProvider>
      {/* Контент всегда в дереве для React */}
      <div className={isHydrated ? "contents" : "opacity-0"}>
        {children}
      </div>
      
      {/* Phantom Overlay (Статический оверлей для предотвращения расхождений) */}
      {!isHydrated && (
        <div 
          className="fixed inset-0 z-[10000] bg-[#010103] flex flex-col items-center justify-center gap-12"
          style={{ pointerEvents: 'all' }}
        >
           <div className="relative">
              <div className="w-24 h-24 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <div className="absolute inset-0 bg-primary/30 blur-[80px] animate-pulse rounded-full" />
           </div>
           <div className="flex flex-col items-center gap-3">
              <p className="text-[11px] font-black uppercase text-white tracking-[0.8em] animate-pulse italic">Nuxus Singularity</p>
              <div className="w-56 h-[1px] bg-white/5 rounded-full overflow-hidden">
                 <div className="h-full bg-primary w-full animate-shimmer" />
              </div>
           </div>
        </div>
      )}
    </FirebaseProvider>
  );
}
