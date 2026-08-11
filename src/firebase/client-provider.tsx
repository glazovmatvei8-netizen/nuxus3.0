'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from './provider';

/**
 * NUXUS ACTIVATOR V17.1 «ZERO-GAP HYDRATION»
 * 
 * РЕШЕНИЕ ОШИБКИ HYDRATION:
 * Мы ВСЕГДА рендерим {children}, чтобы структура дерева на сервере и клиенте
 * совпадала идеально (включая невидимые Suspense границы).
 * Индикатор загрузки рендерится как фиксированный оверлей.
 */
export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Активация интерфейса происходит только после монтажа в DOM (Client-side)
    setMounted(true);
  }, []);

  return (
    <FirebaseProvider>
      {/* Контент всегда в дереве, это предотвращает Mismatch */}
      {children}
      
      {/* Загрузочный экран как Phantom Overlay */}
      {!mounted && (
        <div className="fixed inset-0 z-[10000] bg-[#020205] flex flex-col items-center justify-center gap-6 pointer-events-auto">
           <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
           <p className="text-[9px] font-black uppercase text-primary/40 tracking-[0.4em]">Quantum Core Initializing</p>
        </div>
      )}
    </FirebaseProvider>
  );
}
