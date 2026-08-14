
'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from './provider';
import { cn } from '@/lib/utils';

/**
 * NUXUS HYDRATION SHIELD V28.0
 * 
 * ПОЛНАЯ АННИГИЛЯЦИЯ БЕЛОГО ЭКРАНА:
 * 1. Гарантированный рендеринг контента только после подтверждения маунта в useEffect.
 * 2. Phantom Overlay блокирует взаимодействие, но не ломает гидратацию.
 */
export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Если компонент еще не смонтирован (серверный рендеринг), показываем только заглушку
  if (!mounted) {
    return (
      <div className="fixed inset-0 z-[10000] bg-[#010103] flex flex-col items-center justify-center gap-8">
         <div className="w-16 h-16 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
         <p className="text-[10px] font-black uppercase text-white/20 tracking-[0.5em] animate-pulse">Syncing Engine</p>
      </div>
    );
  }

  return (
    <FirebaseProvider>
      <div className="min-h-screen w-full animate-in fade-in duration-1000">
        {children}
      </div>
    </FirebaseProvider>
  );
}
