
"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RefreshCw, Zap, Download, ShieldCheck, ListChecks } from 'lucide-react';
import { Progress } from './ui/progress';
import versions from '@/app/versions.json';

/**
 * КВАНТОВЫЙ ОБНОВЛЯТОР ЯДРА V25.5.1
 * Оптимизирован для фоновой проверки обновлений без перезагрузки страницы.
 */
const CURRENT_VERSION = "25.5.0"; 

export function UpdateNotifier() {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [serverVersion, setServerVersion] = useState(versions.latestVersion);

  const checkVersion = useCallback(async () => {
    try {
      // Пытаемся получить свежий файл версий с сервера, обходя кэш
      const response = await fetch(`/versions.json?t=${Date.now()}`, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setServerVersion(data.latestVersion);
        
        const lastInstalled = localStorage.getItem('nuxus_last_installed_version');
        
        // Если версия на сервере новее текущего кода ИЛИ новее последней установленной
        if (data.latestVersion !== CURRENT_VERSION && lastInstalled !== data.latestVersion) {
          setIsOpen(true);
        }
      }
    } catch (e) {
      console.warn("Nuxus Sync: Failed to fetch remote version registry.");
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Первичная проверка при запуске
    const timer = setTimeout(checkVersion, 3000);
    
    // Фоновая проверка каждые 5 минут (Live-Sync)
    const interval = setInterval(checkVersion, 300000);

    const handleManualCheck = () => {
      checkVersion();
      setIsOpen(true);
    };
    
    window.addEventListener('nuxus_check_updates', handleManualCheck);
    
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener('nuxus_check_updates', handleManualCheck);
    };
  }, [checkVersion]);

  const handleUpdateAction = () => {
    setIsUpdating(true);
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 25;
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
    }, 120);
  };

  const isUpToDate = serverVersion === localStorage.getItem('nuxus_last_installed_version') && serverVersion === CURRENT_VERSION;

  if (isUpdating) {
    return (
      <div className="fixed inset-0 z-[10000] bg-[#050505] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-full max-w-xs space-y-8 animate-in zoom-in duration-500">
          <div className="bg-white/[0.03] border border-white/10 w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl">
            <Download className="w-10 h-10 text-primary animate-bounce" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Синхронизация</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60">Загрузка патча: {Math.round(updateProgress)}%</p>
          </div>
          <Progress value={updateProgress} className="h-1.5 bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-[420px] bg-[#0a0a0c]/95 backdrop-blur-3xl border-primary/20 rounded-[2.8rem] p-0 overflow-hidden shadow-2xl outline-none">
        <div className="relative h-40 bg-gradient-to-br from-primary/20 to-transparent flex items-center justify-center">
          <Zap className="w-16 h-16 text-primary animate-pulse" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1)_0%,transparent_70%)]" />
        </div>

        <div className="p-8 space-y-6 relative z-10">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter text-white">
              {isUpToDate ? 'Ядро Актуально' : 'Доступен Патч'}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest">
              <span>{isUpToDate ? `V ${serverVersion}` : `Сборка ${serverVersion}`}</span>
              <span className="opacity-30">•</span>
              <span>{versions.sizeMb} МБ</span>
            </DialogDescription>
          </DialogHeader>

          {!isUpToDate ? (
            <div className="space-y-3 bg-white/5 p-5 rounded-3xl border border-white/5 shadow-inner">
              <div className="flex items-center gap-2 text-white/40 mb-1">
                <ListChecks className="w-3.5 h-3.5" />
                <span className="text-[9px] font-black uppercase tracking-widest">Список изменений:</span>
              </div>
              <ul className="space-y-2">
                {versions.changelog.map((item, idx) => (
                  <li key={idx} className="text-[11px] text-white/80 font-medium leading-tight flex gap-2">
                    <span className="text-primary">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10 text-center shadow-xl">
               <ShieldCheck className="w-8 h-8 text-primary mx-auto mb-3" />
               <p className="text-[10px] text-white/80 font-black uppercase tracking-widest">Система полностью синхронизирована.</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {!isUpToDate ? (
              <>
                <Button 
                  onClick={handleUpdateAction}
                  className="h-14 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-primary/30 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <RefreshCw className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-700" />
                  Принять Сигнал
                </Button>
                <Button variant="ghost" onClick={() => setIsOpen(false)} className="h-12 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-white">
                  Игнорировать
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsOpen(false)} className="h-14 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                Закрыть
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
