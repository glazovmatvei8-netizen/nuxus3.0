'use client';

import React, { useState, useEffect, type ReactNode } from 'react';

/**
 * NUXUS HYDRATION SHIELD V65.0
 * 
 * Обеспечивает безопасный мост между серверным рендерингом и клиентским Ядром.
 * Предотвращает ошибки 'call' и 'undefined' при инициализации.
 */
export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="fixed inset-0 z-[10000] bg-[#010103] flex flex-col items-center justify-center gap-8">
         <div className="w-16 h-16 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
         <p className="text-[10px] font-black uppercase text-white/20 tracking-[0.5em] animate-pulse">Syncing Engine</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full animate-in fade-in duration-1000">
      {children}
    </div>
  );
}
