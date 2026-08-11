'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from './provider';

/**
 * NUXUS ACTIVATOR V23.0 «QUANTUM TERMINAL»
 * 
 * РЕШЕНИЕ ОШИБКИ HYDRATION:
 * Оверлей не меняет дерево DOM. Контент всегда в дереве.
 */
export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <FirebaseProvider>
      {/* Дерево React остается неизменным для SSR */}
      {children}
      
      {/* Прозрачный оверлей гидратации */}
      {!mounted && (
        <div className="fixed inset-0 z-[10000] bg-[#010103] flex flex-col items-center justify-center gap-8">
           <div className="relative">
              <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <div className="absolute inset-0 bg-primary/20 blur-3xl animate-pulse-neon rounded-full" />
           </div>
           <div className="flex flex-col items-center gap-2">
              <p className="text-[10px] font-black uppercase text-white tracking-[0.6em] animate-pulse italic">Quantum Syncing</p>
              <div className="w-48 h-0.5 bg-white/5 rounded-full overflow-hidden">
                 <div className="h-full bg-primary w-1/3 animate-[shimmer_2s_infinite]" />
              </div>
           </div>
        </div>
      )}
    </FirebaseProvider>
  );
}
