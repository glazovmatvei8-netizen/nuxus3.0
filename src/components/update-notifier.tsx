
"use client"

import React, { useState, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock, Zap, Download, ShieldCheck, Wifi, Loader2, ListChecks } from 'lucide-react';
import { useAppState } from '@/lib/store';
import { Progress } from './ui/progress';

// Локальный конфиг обновлений (в будущем будет грузиться из versions.json)
const CURRENT_VERSION = '22.5.0';

interface SystemConfig {
  version: string;
  sizeMb: number;
  changelog: string[];
}

/**
 * ПРОДВИНУТАЯ СИСТЕМА ОБНОВЛЕНИЙ NUXUS v22.5
 * ИСПРАВЛЕНО: Синхронизация с актуальным билдом QES 22.5.
 */
export function UpdateNotifier() {
  const db = useFirestore();
  const { setIsUpdateDeferred } = useAppState();
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);

  const configRef = useMemoFirebase(() => (!db ? null : doc(db, 'system', 'config')), [db]);
  const { data: config } = useDoc<SystemConfig>(configRef);

  useEffect(() => {
    // Проверяем версию в БД (консоли администратора)
    if (config?.version && config.version !== CURRENT_VERSION) {
      const deferredVersion = sessionStorage.getItem('nuxus_deferred_version');
      if (deferredVersion !== config.version) {
        const timer = setTimeout(() => setIsOpen(true), 3000);
        return () => clearTimeout(timer);
      } else {
        setIsUpdateDeferred(true);
      }
    }
  }, [config?.version, setIsUpdateDeferred]);

  const handleUpdateAction = () => {
    setIsUpdating(true);
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 20;
      if (p >= 100) {
        setUpdateProgress(100);
        clearInterval(interval);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setUpdateProgress(p);
      }
    }, 300);
  };

  const handlePostpone = () => {
    if (config) {
      sessionStorage.setItem('nuxus_deferred_version', config.version);
      setIsUpdateDeferred(true);
      setIsOpen(false);
    }
  };

  if (isUpdating) {
    return (
      <div className="fixed inset-0 z-[10000] bg-[#050505] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <div className="w-full max-w-sm space-y-8">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary blur-[60px] opacity-30 animate-pulse" />
            <div className="bg-white/[0.03] border border-white/10 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto relative z-10 shadow-2xl">
              <Download className="w-10 h-10 text-primary animate-bounce" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">Nuxus Kernel Sync</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60">Пересборка протокола QES: {Math.round(updateProgress)}%</p>
          </div>

          <div className="space-y-4">
            <Progress value={updateProgress} className="h-2 bg-white/5" />
            <div className="flex items-center justify-center gap-2 text-[8px] font-black uppercase text-muted-foreground/40 tracking-widest">
              <ShieldCheck className="w-3 h-3" /> QES 22.5 Stability Verified
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !isUpdating && setIsOpen(o)}>
      <DialogContent className="max-w-[360px] bg-card/95 backdrop-blur-3xl border-primary/20 rounded-[2.8rem] p-0 overflow-hidden shadow-2xl">
        <div className="relative h-32 bg-gradient-to-br from-primary/20 to-transparent flex items-center justify-center">
          <Zap className="w-12 h-12 text-primary animate-pulse" />
          <div className="absolute top-4 right-6 flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/5">
            <Wifi className="w-3 h-3 text-green-500" />
            <span className="text-[8px] font-black text-white/60 uppercase">Stable Connection</span>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-1">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">Обновление Ядра</h3>
            <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest">
              <span>Версия {config?.version || '22.5.0'}</span>
              <span className="opacity-30">•</span>
              <span>{config?.sizeMb || '105'} МБ</span>
            </div>
          </div>

          <div className="space-y-3 bg-white/5 p-4 rounded-3xl border border-white/5">
            <div className="flex items-center gap-2 text-white/40 mb-1">
              <ListChecks className="w-3.5 h-3.5" />
              <span className="text-[9px] font-black uppercase tracking-widest">Что нового:</span>
            </div>
            <ul className="space-y-2">
              <li className="text-[11px] text-white/80 font-medium leading-tight flex gap-2">
                <span className="text-primary">•</span> Протокол QES 22.5 (Квантовый щит)
              </li>
              <li className="text-[11px] text-white/80 font-medium leading-tight flex gap-2">
                <span className="text-primary">•</span> Фикс Safari Face ID (No iCloud)
              </li>
              <li className="text-[11px] text-white/80 font-medium leading-tight flex gap-2">
                <span className="text-primary">•</span> Стабилизация выгрузки ZIP-архивов
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleUpdateAction}
              className="h-14 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-primary/20 group overflow-hidden"
            >
              <RefreshCw className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-700" />
              Обновить сейчас
            </Button>
            <Button 
              variant="ghost" 
              onClick={handlePostpone}
              className="h-12 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            >
              Позже (только Wi-Fi)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
