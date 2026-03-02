
"use client"

import React from 'react';
import { NuxusLogo } from './nuxus-logo';
import { Button } from '@/components/ui/button';
import { Share, PlusSquare, ChevronRight, Star, ShieldCheck, Zap } from 'lucide-react';

/**
 * Native-like iOS App Store Installation Screen
 */
export function IosInstaller({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-[1000] bg-[#0a0a0c] flex flex-col items-center overflow-y-auto pb-10 scrollbar-hide">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-full h-full bg-primary/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-full h-full bg-accent/5 blur-[150px] rounded-full" />
      </div>

      <div className="w-full max-w-md px-6 pt-12 relative z-10 flex flex-col items-center">
        <div className="mb-8 animate-float">
          <NuxusLogo size={120} />
        </div>

        <div className="text-center space-y-2 mb-10">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">Nuxus Mobile</h1>
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-primary">Ядро готово к развертыванию</p>
        </div>

        {/* Fake App Store Stats */}
        <div className="w-full flex justify-between px-4 mb-10 border-y border-white/5 py-6">
          <div className="flex flex-col items-center gap-1">
            <span className="text-white font-black text-lg">4.9</span>
            <div className="flex gap-0.5"><Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" /><Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" /><Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" /><Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" /><Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" /></div>
            <span className="text-[8px] font-bold text-muted-foreground uppercase">Рейтинг</span>
          </div>
          <div className="w-px h-10 bg-white/5" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-white font-black text-lg">12+</span>
            <span className="text-[8px] font-bold text-muted-foreground uppercase">Возраст</span>
          </div>
          <div className="w-px h-10 bg-white/5" />
          <div className="flex flex-col items-center gap-1">
            <Zap className="w-6 h-6 text-primary" />
            <span className="text-[8px] font-bold text-muted-foreground uppercase">Скорость</span>
          </div>
        </div>

        {/* Step by Step Guide */}
        <div className="w-full space-y-4 mb-12">
          <div className="bg-card/40 backdrop-blur-xl border border-white/5 p-5 rounded-[2rem] flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0">
              <Share className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Шаг 1</p>
              <p className="text-sm font-bold text-white leading-tight">Нажмите на кнопку «Поделиться» в панели Safari</p>
            </div>
          </div>

          <div className="bg-card/40 backdrop-blur-xl border border-white/5 p-5 rounded-[2rem] flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0">
              <PlusSquare className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Шаг 2</p>
              <p className="text-sm font-bold text-white leading-tight">Прокрутите вниз и выберите «На экран „Домой“»</p>
            </div>
          </div>

          <div className="bg-card/40 backdrop-blur-xl border border-white/10 p-5 rounded-[2rem] flex items-center gap-4 shadow-xl shadow-primary/5">
            <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Финальный этап</p>
              <p className="text-sm font-bold text-white leading-tight">Запустите Nuxus с рабочего стола для полной активации</p>
            </div>
          </div>
        </div>

        <Button 
          variant="ghost" 
          onClick={onDismiss} 
          className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 hover:opacity-100 mb-4"
        >
          Продолжить в браузере (не рекомендуется)
        </Button>

        <div className="text-[8px] text-muted-foreground/40 uppercase font-black tracking-widest text-center px-10">
          Nuxus Core оптимизирован для работы как автономное приложение. Без установки некоторые функции (пуш-уведомления, FaceID) могут быть ограничены.
        </div>
      </div>
    </div>
  );
}
