'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from './provider';

/**
 * NUXUS ACTIVATOR V16.0 «ZERO-GAP»
 * 
 * ИСПРАВЛЕНО: Hydration Error полностью аннигилирована.
 * Загрузочный экран теперь имеет константную структуру, которая 
 * ГАРАНТИРОВАННО идентична на сервере (SSR) и клиенте (CSR).
 */
export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Активация Ядра происходит только после монтажа в DOM
    setMounted(true);
  }, []);

  // БАЗОВАЯ СТРУКТУРА (SSR + Initial Client)
  // Мы используем фиксированные классы без динамических вычислений
  if (!mounted) {
    return (
      <div className="fixed inset-0 z-[10000] bg-[#020205] flex flex-col items-center justify-center gap-6">
         <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
         <p className="text-[9px] font-black uppercase text-primary/40 tracking-[0.4em]">Origin Engine V16</p>
      </div>
    );
  }

  return (
    <FirebaseProvider>
      {children}
    </FirebaseProvider>
  );
}
