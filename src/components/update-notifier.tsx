
"use client"

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RefreshCw, Zap, Download, ShieldCheck, ListChecks } from 'lucide-react';
import { Progress } from './ui/progress';
import versions from '@/app/versions.json';

/**
 * КВАНТОВЫЙ ОБНОВЛЯТОР ЯДРА V23.3
 * Синхронизировано: 22.9.0
 */
const CURRENT_VERSION = "22.9.0";

export function UpdateNotifier() {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);

  // Сверяем версию в коде с версией в versions.json
  const isUpToDate = versions.latestVersion === CURRENT_VERSION;

  useEffect(() => {
    const checkVersion = () => {
      // Если версии не совпадают И мы еще не сохранили эту версию в localStorage
      if (!isUpToDate) {
        const lastInstalled = localStorage.getItem('nuxus_last_installed_version');
        if (lastInstalled !== versions.latestVersion) {
          setTimeout(() => {
            setIsOpen(true);
          }, 2000);
        }
      }
    };
    checkVersion();

    const handleManualCheck = () => {
      setIsOpen(true);
    };
    window.addEventListener('nuxus_check_updates', handleManualCheck);
    return () => window.removeEventListener('nuxus_check_updates', handleManualCheck);
  }, [isUpToDate]);

  const handleUpdateAction = () => {
    setIsUpdating(true);
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 20;
      if (p >= 100) {
        setUpdateProgress(100);
        clearInterval(interval);
        localStorage.setItem('nuxus_last_installed_version', versions.latestVersion);
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        setUpdateProgress(p);
      }
    }, 300);
  };

  const handlePostpone = () => {
    setIsOpen(false);
  };

  if (isUpdating) {
    return (
      <div className="fixed inset-0 z-[10000] bg-[#050505] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <div className="w-full max-sm:max-w-xs space-y-8">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary blur-[60px] opacity-30 animate-pulse" />
            <div className="bg-white/[0.03] border border-white/10 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto relative z-10 shadow-2xl">
              <Download className="w-10 h-10 text-primary animate-bounce" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">Nuxus Kernel Sync</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60">Обновление QES: {Math.round(updateProgress)}%</p>
          </div>

          <div className="space-y-4">
            <Progress value={updateProgress} className="h-2 bg-white/5" />
            <div className="flex items-center justify-center gap-2 text-[8px] font-black uppercase text-muted-foreground/40 tracking-widest">
              <ShieldCheck className="w-3 h-3" /> QES Integrity Verified
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-[420px] bg-card/95 backdrop-blur-3xl border-primary/20 rounded-[2.8rem] p-0 overflow-hidden shadow-2xl outline-none">
        <div className="relative h-40 bg-gradient-to-br from-primary/20 to-transparent flex items-center justify-center">
          <Zap className="w-16 h-16 text-primary animate-pulse" />
        </div>

        <div className="p-8 space-y-6">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter text-white">
              {isUpToDate ? 'Ядро актуально' : 'Доступна новая версия'}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest">
              <span>{isUpToDate ? `V ${CURRENT_VERSION}` : `Билд ${versions.latestVersion}`}</span>
              <span className="opacity-30">•</span>
              <span>{versions.sizeMb} МБ</span>
            </DialogDescription>
          </DialogHeader>

          {(!isUpToDate) ? (
            <div className="space-y-3 bg-white/5 p-4 rounded-3xl border border-white/5">
              <div className="flex items-center gap-2 text-white/40 mb-1">
                <ListChecks className="w-3.5 h-3.5" />
                <span className="text-[9px] font-black uppercase tracking-widest">Что нового:</span>
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
            <div className="p-6 bg-green-500/5 rounded-3xl border border-green-500/10 text-center">
               <ShieldCheck className="w-8 h-8 text-green-500 mx-auto mb-3" />
               <p className="text-[10px] text-green-500/80 font-black uppercase tracking-widest">Ваш узел синхронизирован с патчем QES</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {!isUpToDate ? (
              <>
                <Button 
                  onClick={handleUpdateAction}
                  className="h-14 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-primary/30 group"
                >
                  <RefreshCw className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-700" />
                  Обновить сейчас
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={handlePostpone}
                  className="h-12 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-white rounded-xl"
                >
                  Напомнить позже
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => setIsOpen(false)}
                className="h-14 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest"
              >
                Закрыть
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
