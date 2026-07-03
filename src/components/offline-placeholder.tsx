
"use client"

import React, { useState, useEffect } from 'react';
import { WifiOff, Zap, ShieldAlert, RefreshCw } from 'lucide-react';
import { NuxusLogo } from './nuxus-logo';
import { Button } from './ui/button';

/**
 * ОФФЛАЙН-ЗАГЛУШКА V25.1.0
 * ОПТИМИЗИРОВАНО: Задержка в 3 секунды перед показом, чтобы исключить мерцание при долгой загрузке.
 */
export function OfflinePlaceholder() {
  const [isOnline, setIsOnline] = useState(true);
  const [showPlaceholder, setShowPlaceholder] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowPlaceholder(false);
    };
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!isOnline) {
      // Даем Ядру 3 секунды на восстановление сигнала перед показом ошибки
      timer = setTimeout(() => {
        setShowPlaceholder(true);
      }, 3000);
    } else {
      setShowPlaceholder(false);
    }
    return () => clearTimeout(timer);
  }, [isOnline]);

  if (!showPlaceholder) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a0c] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      <div className="absolute inset-0 nuxus-core-glow opacity-20 animate-pulse-glow" />
      
      <div className="relative space-y-8 max-w-sm">
        <div className="flex justify-center">
          <div className="relative">
            <NuxusLogo size={140} className="opacity-40 grayscale" />
            <div className="absolute inset-0 flex items-center justify-center">
              <WifiOff className="w-12 h-12 text-primary animate-pulse" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">
            Signal Lost
          </h2>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60 leading-relaxed">
            Связь с Ядром прервана. Проверьте сетевое соединение вашего устройства.
          </p>
        </div>

        <div className="p-4 bg-primary/5 rounded-3xl border border-primary/10 space-y-2">
          <div className="flex items-center gap-2 text-primary justify-center">
            <ShieldAlert className="w-4 h-4" />
            <span className="text-[9px] font-black uppercase tracking-widest">Автономный режим</span>
          </div>
          <p className="text-[8px] text-muted-foreground uppercase font-bold">
            Ваши данные в безопасности. Ядро возобновит синхронизацию при появлении сигнала.
          </p>
        </div>

        <Button 
          variant="outline" 
          className="w-full h-12 rounded-2xl border-white/5 bg-white/5 font-black uppercase text-[10px] tracking-widest gap-2"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="w-4 h-4" /> Переподключить Ядро
        </Button>
      </div>
    </div>
  );
}
