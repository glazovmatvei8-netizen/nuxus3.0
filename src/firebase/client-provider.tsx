
'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from './provider';
import { nuxus } from '@/lib/nuxus-engine';

/**
 * ORIGIN ACTIVATOR V13.0
 * Отрабатывает только после того, как браузер подтвердит готовность (mounted).
 */
export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="fixed inset-0 z-[10000] bg-[#020205] flex flex-col items-center justify-center gap-6">
         <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin shadow-[0_0_20px_rgba(168,85,247,0.3)]" />
         <p className="text-[9px] font-black uppercase text-primary/40 tracking-[0.4em] animate-pulse">Origin Engine V13</p>
      </div>
    );
  }

  return (
    <FirebaseProvider>
      {children}
    </FirebaseProvider>
  );
}
