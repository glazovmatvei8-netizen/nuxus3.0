
"use client"

import React, { useState, useEffect } from 'react';
import { Loader2, ZapOff, CloudOff } from 'lucide-react';

/**
 * ОФФЛАЙН-ИНДИКАТОР V86.0 (HQ Persistence Mode)
 * ОПТИМИЗИРОВАНО: Элегантная полоса статуса в стиле нативных мессенджеров.
 */
export function OfflinePlaceholder() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[10000] h-[calc(env(safe-area-inset-top)+32px)] flex items-end justify-center pointer-events-none animate-in slide-in-from-top duration-700">
      <div className="absolute inset-0 bg-primary/10 backdrop-blur-3xl border-b border-primary/20 shadow-2xl" />
      
      <div className="relative z-10 flex items-center gap-3 mb-2 px-6 py-1 bg-black/40 rounded-full border border-primary/20 shadow-xl scale-90 sm:scale-100">
        <div className="relative">
          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
          <CloudOff className="absolute inset-0 w-3.5 h-3.5 text-primary/40 scale-50" />
        </div>
        <div className="flex flex-col">
           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Ожидание сети</span>
           <span className="text-[7px] font-bold uppercase tracking-[0.1em] text-primary/60">Локальное ядро активно</span>
        </div>
      </div>
      
      {/* SHIMMER EFFECT FOR TOP BAR */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-[shimmer_2s_infinite]" />
    </div>
  );
}
