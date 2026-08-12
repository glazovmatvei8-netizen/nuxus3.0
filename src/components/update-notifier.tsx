"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Zap, Download, ArrowUpCircle } from 'lucide-react';
import nuxusVersions from '@/app/versions.json';

/**
 * КВАНТОВЫЙ ОБНОВЛЯТОР ЯДРА V43.0
 * ИСПРАВЛЕНО: Бесконечный цикл сравнения версий.
 */
const CURRENT_VERSION = "8.5.0"; 

export function UpdateNotifier() {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Проверка необходимости обновления
    const lastSeenVersion = localStorage.getItem('nuxus_last_installed_version_v43');
    if (nuxusVersions.latestVersion !== CURRENT_VERSION && lastSeenVersion !== nuxusVersions.latestVersion) {
      const timer = setTimeout(() => setIsOpen(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleUpdateAction = () => {
    setIsUpdating(true);
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 25;
      if (p >= 100) {
        setUpdateProgress(100);
        clearInterval(interval);
        localStorage.setItem('nuxus_last_installed_version_v43', nuxusVersions.latestVersion);
        setTimeout(() => window.location.reload(), 500);
      } else {
        setUpdateProgress(p);
      }
    }, 150);
  };

  if (isUpdating) {
    return (
      <div className="fixed inset-0 z-[10000] bg-[#020205] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-full max-w-xs space-y-12">
          <div className="bg-primary/20 border border-primary/20 w-32 h-32 rounded-[3rem] flex items-center justify-center mx-auto relative">
            <Download className="w-14 h-14 text-primary animate-bounce" />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">Kernel Resonance</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary/60">Downloading patch V{nuxusVersions.latestVersion}: {Math.round(updateProgress)}%</p>
          </div>
          <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
             <div className="h-full bg-primary shadow-[0_0_20px_rgba(var(--primary),0.8)] transition-all duration-300" style={{ width: `${updateProgress}%` }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-[440px] bg-[#0a0a0c]/98 backdrop-blur-3xl border-primary/30 rounded-[3.5rem] p-0 overflow-hidden shadow-2xl outline-none z-[10000]">
        <div className="relative h-56 bg-gradient-to-br from-primary/30 to-transparent flex flex-col items-center justify-center overflow-hidden">
          <Zap className="w-24 h-24 text-primary animate-pulse relative z-10" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary),0.2)_0%,transparent_70%)]" />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 px-5 py-2 rounded-full border border-white/10 shadow-2xl">
             <ArrowUpCircle className="w-4 h-4 text-primary" />
             <span className="text-[10px] font-black text-white uppercase tracking-widest">Firmware V{nuxusVersions.latestVersion}</span>
          </div>
        </div>
        <div className="p-8 space-y-8">
          <DialogHeader>
            <DialogTitle className="sr-only">Kernel Update</DialogTitle>
            <DialogDescription className="sr-only">System update notification</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 bg-white/[0.03] p-6 rounded-[2.5rem] border border-white/5">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/60 px-1">Changelog:</span>
            <ul className="space-y-4">
              {nuxusVersions.changelog.map((item, idx) => (
                <li key={idx} className="text-[13px] text-white/90 font-medium leading-relaxed flex gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0 shadow-[0_0_8px_rgba(var(--primary),1)]" /> 
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <Button onClick={handleUpdateAction} className="w-full h-16 bg-primary text-white rounded-[1.8rem] font-black uppercase italic tracking-widest shadow-2xl shadow-primary/30 active:scale-95 transition-all text-lg border border-white/10">
            Install Patch
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
