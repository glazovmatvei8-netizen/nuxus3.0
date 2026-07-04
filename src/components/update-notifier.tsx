
"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RefreshCw, Zap, Download, ShieldCheck, ListChecks, ArrowUpCircle } from 'lucide-react';
import { Progress } from './ui/progress';
import nuxusVersions from '@/app/versions.json';

/**
 * КВАНТОВЫЙ ОБНОВЛЯТОР ЯДРА V26.4.0 (Live-Pulse)
 */
const CURRENT_VERSION = "26.4.0"; 

export function UpdateNotifier() {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [serverVersion, setServerVersion] = useState(nuxusVersions.latestVersion);
  const [changelog, setChangelog] = useState<string[]>(nuxusVersions.changelog);

  const checkVersion = useCallback(async () => {
    try {
      const response = await fetch(`/versions.json?t=${Date.now()}`, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setServerVersion(data.latestVersion);
        setChangelog(data.changelog);
        
        const lastInstalled = localStorage.getItem('nuxus_last_installed_version');
        
        if (data.latestVersion === CURRENT_VERSION) {
          localStorage.setItem('nuxus_last_installed_version', data.latestVersion);
          setIsOpen(false);
          return;
        }

        if (data.latestVersion !== CURRENT_VERSION && lastInstalled !== data.latestVersion) {
          setIsOpen(true);
        }
      }
    } catch (e) {
      console.warn("Nuxus Sync: Signal lost.");
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const timer = setTimeout(checkVersion, 2000);
    const interval = setInterval(checkVersion, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };
    
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('nuxus_check_updates', checkVersion);
    
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('nuxus_check_updates', checkVersion);
    };
  }, [checkVersion]);

  const handleUpdateAction = () => {
    setIsUpdating(true);
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 20;
      if (p >= 100) {
        setUpdateProgress(100);
        clearInterval(interval);
        localStorage.setItem('nuxus_last_installed_version', serverVersion);
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        setUpdateProgress(p);
      }
    }, 100);
  };

  if (isUpdating) {
    return (
      <div className="fixed inset-0 z-[10000] bg-[#050505] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <div className="w-full max-w-xs space-y-10">
          <div className="bg-primary/10 border border-primary/20 w-28 h-28 rounded-[3rem] flex items-center justify-center mx-auto shadow-2xl relative">
            <Download className="w-12 h-12 text-primary animate-bounce" />
            <div className="absolute inset-0 border-2 border-primary/20 rounded-[3rem] animate-ping opacity-20" />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">Синхронизация</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary/60">Загрузка сегмента: {Math.round(updateProgress)}%</p>
          </div>
          <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
             <div className="h-full bg-primary shadow-[0_0_20px_rgba(168,85,247,0.8)] transition-all duration-300" style={{ width: `${updateProgress}%` }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-[440px] bg-[#0a0a0c]/98 backdrop-blur-3xl border-primary/30 rounded-[3rem] p-0 overflow-hidden shadow-[0_0_100px_rgba(168,85,247,0.3)] outline-none animate-in slide-in-from-bottom-10 duration-700">
        <div className="relative h-48 bg-gradient-to-br from-primary/30 to-transparent flex flex-col items-center justify-center overflow-hidden">
          <Zap className="w-20 h-20 text-primary animate-pulse relative z-10" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.2)_0%,transparent_70%)]" />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/40 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
             <ArrowUpCircle className="w-3.5 h-3.5 text-primary" />
             <span className="text-[9px] font-black text-white uppercase tracking-widest">Новый сигнал обнаружен</span>
          </div>
        </div>

        <div className="p-8 space-y-8 relative z-10">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter text-white">Ядро {serverVersion}</DialogTitle>
              <span className="text-[10px] font-black bg-white/5 border border-white/10 px-3 py-1 rounded-lg text-primary">155 MB</span>
            </div>
            <DialogDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">
              Критическое обновление системных протоколов
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 bg-white/[0.03] p-6 rounded-[2.2rem] border border-white/5 shadow-inner">
            <div className="flex items-center gap-3 text-white/40 mb-2">
              <ListChecks className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest">Список модификаций:</span>
            </div>
            <ul className="space-y-3">
              {changelog.map((item, idx) => (
                <li key={idx} className="text-[13px] text-white/90 font-medium leading-snug flex gap-3 animate-in fade-in slide-in-from-left-2" style={{ animationDelay: `${idx * 100}ms` }}>
                  <span className="text-primary mt-1 shrink-0">•</span> 
                  <span className="tracking-tight">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <Button 
              onClick={handleUpdateAction}
              className="h-16 bg-primary text-white rounded-[1.5rem] font-black uppercase italic tracking-widest shadow-2xl shadow-primary/30 group relative overflow-hidden active:scale-95 transition-all text-sm"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <RefreshCw className="w-5 h-5 mr-3 group-hover:rotate-180 transition-transform duration-700" />
              Активировать патч
            </Button>
            <Button variant="ghost" onClick={() => setIsOpen(false)} className="h-12 text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 hover:text-white transition-all">
              Игнорировать (временно)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
