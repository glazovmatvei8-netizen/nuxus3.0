'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from './provider';
import { cn } from '@/lib/utils';

/**
 * NUXUS HYDRATION SHIELD V27.0
 * 
 * ПОЛНАЯ АННИГИЛЯЦИЯ БЕЛОГО ЭКРАНА:
 * 1. Использование динамической прозрачности вместо блокирующих условий.
 * 2. Гарантированный маунт через задержку в useEffect.
 */
export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Гарантируем, что клиентская часть готова
    const timer = setTimeout(() => {
      setIsHydrated(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <FirebaseProvider>
      {/* Контент всегда присутствует в DOM, но невидим до гидратации */}
      <div className={cn(
        "min-h-screen w-full transition-opacity duration-700 ease-in-out",
        isHydrated ? "opacity-100" : "opacity-0"
      )}>
        {children}
      </div>
      
      {/* Phantom Overlay (Визуальный загрузчик) */}
      {!isHydrated && (
        <div 
          className="fixed inset-0 z-[10000] bg-[#010103] flex flex-col items-center justify-center gap-12"
          style={{ pointerEvents: 'none' }}
        >
           <div className="relative">
              <div className="w-20 h-20 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <div className="absolute inset-0 bg-primary/30 blur-[60px] animate-pulse rounded-full" />
           </div>
           <div className="flex flex-col items-center gap-3">
              <p className="text-[10px] font-black uppercase text-white tracking-[0.6em] animate-pulse italic">Nuxus Singularity</p>
              <div className="w-48 h-[1px] bg-white/5 rounded-full overflow-hidden mt-2">
                 <div className="h-full bg-primary w-full animate-pulse" />
              </div>
           </div>
        </div>
      )}
    </FirebaseProvider>
  );
}
