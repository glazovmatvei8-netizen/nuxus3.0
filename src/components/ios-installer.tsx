
"use client"

import React from 'react';
import { NuxusLogo } from './nuxus-logo';
import { Button } from '@/components/ui/button';
import { Share, PlusSquare, ShieldCheck, Zap, Info } from 'lucide-react';

/**
 * Native-like iOS App Store Installation Screen
 * Оптимизирован для имитации нативного App Store.
 */
export function IosInstaller({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-[2000] bg-[#0a0a0c] flex flex-col items-center overflow-y-auto pb-20 scrollbar-hide">
      {/* Эффект матового стекла сверху */}
      <div className="sticky top-0 w-full h-16 bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-white/5 z-20 flex items-center justify-between px-6">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">App Store</span>
        <Button variant="ghost" onClick={onDismiss} className="text-[10px] font-black uppercase text-primary">Отмена</Button>
      </div>

      <div className="w-full max-w-md px-6 pt-10 relative z-10 flex flex-col items-center">
        {/* Иконка и заголовок как в App Store */}
        <div className="w-full flex gap-6 mb-8">
          <div className="w-32 h-32 rounded-[2.5rem] bg-card border border-white/10 shadow-2xl flex items-center justify-center shrink-0 overflow-hidden">
             <NuxusLogo size={100} />
          </div>
          <div className="flex flex-col justify-center flex-1">
            <h1 className="text-2xl font-black text-white leading-tight">Nuxus Messenger</h1>
            <p className="text-primary text-xs font-bold uppercase tracking-widest mt-1">Quantum Kernel</p>
            <div className="mt-4">
              <Button className="bg-[#007AFF] hover:bg-[#007AFF]/90 text-white rounded-full h-8 px-6 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-[#007AFF]/30">
                Установить
              </Button>
            </div>
          </div>
        </div>

        {/* Характеристики */}
        <div className="w-full grid grid-cols-3 gap-0.5 border-y border-white/5 py-4 mb-8">
          <div className="flex flex-col items-center">
            <span className="text-white font-black text-sm">4.9 ★</span>
            <span className="text-[8px] font-bold text-muted-foreground uppercase">74K Оценок</span>
          </div>
          <div className="w-px h-8 bg-white/5 self-center" />
          <div className="flex flex-col items-center">
            <span className="text-white font-black text-sm">12+</span>
            <span className="text-[8px] font-bold text-muted-foreground uppercase">Возраст</span>
          </div>
          <div className="w-px h-8 bg-white/5 self-center" />
          <div className="flex flex-col items-center">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-[8px] font-bold text-muted-foreground uppercase">Fast Build</span>
          </div>
        </div>

        {/* Инструкция установки */}
        <div className="w-full space-y-4">
          <h2 className="text-white font-black text-sm uppercase italic px-2">Инструкция</h2>
          
          <div className="bg-white/5 p-4 rounded-3xl flex items-center gap-4 border border-white/5">
            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center">
              <Share className="w-5 h-5 text-[#007AFF]" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-bold text-white">1. Меню «Поделиться»</p>
              <p className="text-[9px] text-muted-foreground uppercase">Нажмите на иконку внизу экрана</p>
            </div>
          </div>

          <div className="bg-white/5 p-4 rounded-3xl flex items-center gap-4 border border-white/5">
            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center">
              <PlusSquare className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-bold text-white">2. Добавить на экран «Домой»</p>
              <p className="text-[9px] text-muted-foreground uppercase">Прокрутите список функций вниз</p>
            </div>
          </div>

          <div className="bg-primary/10 p-4 rounded-3xl flex items-center gap-4 border border-primary/20">
            <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-bold text-white">3. Готово!</p>
              <p className="text-[9px] text-muted-foreground uppercase">Запустите Nuxus с рабочего стола</p>
            </div>
          </div>
        </div>

        <div className="mt-12 bg-[#1c1c1e] p-6 rounded-[2.5rem] w-full border border-white/5">
            <div className="flex items-center gap-2 mb-3 text-accent">
                <Info className="w-4 h-4" />
                <h3 className="text-[10px] font-black uppercase tracking-widest">Информация для IPA</h3>
            </div>
            <p className="text-[9px] text-muted-foreground leading-relaxed uppercase font-bold">
                Если вам нужен именно .IPA файл для установки через AltStore/Sideloadly, обратитесь к README.md в корне проекта для настройки GitHub Actions.
            </p>
        </div>
      </div>
    </div>
  );
}
