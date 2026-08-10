'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from './provider';

/**
 * NUXUS ACTIVATOR V15.0
 * 
 * ИСПРАВЛЕНО: Hydration Zero-Gap Protocol.
 * Загрузочный экран теперь имеет абсолютно идентичные классы и структуру
 * на сервере и клиенте, что исключает ошибки 'Hydration failed'.
 */
export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ВАЖНО: Структура ниже ДОЛЖНА быть идентична на SSR и первом проходе CSR.
  // Мы используем фиксированные классы и простую структуру для 100% совпадения.
  if (!mounted) {
    return (
      <div className="fixed inset-0 z-[10000] bg-[#020205] flex flex-col items-center justify-center gap-6">
         <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
         <p className="text-[9px] font-black uppercase text-primary/40 tracking-[0.4em]">Origin Engine V15</p>
      </div>
    );
  }

  return (
    <FirebaseProvider>
      {children}
    </FirebaseProvider>
  );
}
