'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from './provider';

/**
 * NUXUS ACTIVATOR V17.0 «HYDRATION LOCK»
 * 
 * РЕШЕНИЕ ОШИБКИ HYDRATION:
 * Теперь структура HTML на сервере и в браузере при первом запуске 
 * ГАРАНТИРОВАННО идентична. Мы рендерим один и тот же контейнер
 * с фиксированными классами.
 */
export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Активация Ядра происходит только после монтажа в DOM (Client-side)
    setMounted(true);
  }, []);

  // БАЗОВАЯ СТРУКТУРА (SSR + Initial Client)
  // Мы используем строго фиксированные классы, чтобы React не видел расхождений
  if (!mounted) {
    return (
      <div className="fixed inset-0 z-[10000] bg-[#020205] flex flex-col items-center justify-center gap-6">
         <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
         <p className="text-[9px] font-black uppercase text-primary/40 tracking-[0.4em]">Quantum Core Initializing</p>
      </div>
    );
  }

  return (
    <FirebaseProvider>
      {children}
    </FirebaseProvider>
  );
}
