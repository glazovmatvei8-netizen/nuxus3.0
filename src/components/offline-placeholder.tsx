"use client"

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * ОФФЛАЙН-ИНДИКАТОР V25.2.0 (Telegram Style)
 * ОПТИМИЗИРОВАНО: Больше не блокирует экран. Показывает статус подключения в верхней части.
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
    <div className="fixed top-0 left-0 right-0 z-[10000] bg-primary/20 backdrop-blur-xl border-b border-primary/30 h-[calc(env(safe-area-inset-top)+28px)] flex items-end justify-center pb-2 animate-in slide-in-from-top duration-500 pointer-events-none">
      <div className="flex items-center gap-2 mb-0.5">
        <Loader2 className="w-3 h-3 text-primary animate-spin" />
        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white">Ожидание сети...</span>
      </div>
    </div>
  );
}
