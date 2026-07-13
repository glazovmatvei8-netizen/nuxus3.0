
"use client"

import React from 'react';
import { NuxusLogo } from './nuxus-logo';
import { Button } from '@/components/ui/button';
import { Share, PlusSquare, ShieldCheck, Zap, Info, Download, AppWindow, Smartphone } from 'lucide-react';
import Link from 'next/link';

/**
 * Native-like iOS App Store Installation Screen
 * Оптимизирован для предложения нативного .IPA или PWA.
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
        {/* Иконка и заголовок */}
        <div className="w-full flex gap-6 mb-8 text-left">
          <div className="w-32 h-32 rounded-[2.5rem] bg-card border border-white/10 shadow-2xl flex items-center justify-center shrink-0 overflow-hidden">
             <NuxusLogo size={100} />
          </div>
          <div className="flex flex-col justify-center flex-1">
            <h1 className="text-2xl font-black text-white leading-tight">Nuxus 2.0</h1>
            <p className="text-primary text-xs font-bold uppercase tracking-widest mt-1">Full Native Client</p>
            <div className="mt-4 flex gap-2">
              <Button className="bg-[#007AFF] hover:bg-[#007AFF]/90 text-white rounded-full h-8 px-6 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-[#007AFF]/30">
                Загрузить
              </Button>
              <Link href="/download">
                 <Button variant="ghost" className="h-8 w-8 rounded-full bg-white/5 p-0">
                    <Smartphone className="w-4 h-4 text-white" />
                 </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Характеристики */}
        <div className="w-full grid grid-cols-3 gap-0.5 border-y border-white/5 py-4 mb-8">
          <div className="flex flex-col items-center">
            <span className="text-white font-black text-sm">V33.2</span>
            <span className="text-[8px] font-bold text-muted-foreground uppercase">Версия</span>
          </div>
          <div className="w-px h-8 bg-white/5 self-center" />
          <div className="flex flex-col items-center">
            <span className="text-white font-black text-sm">Native</span>
            <span className="text-[8px] font-bold text-muted-foreground uppercase">Engine</span>
          </div>
          <div className="w-px h-8 bg-white/5 self-center" />
          <div className="flex flex-col items-center">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-[8px] font-bold text-muted-foreground uppercase">Verified</span>
          </div>
        </div>

        {/* Выбор метода установки */}
        <div className="w-full space-y-4">
          <h2 className="text-white font-black text-sm uppercase italic px-2 text-left">Выберите метод</h2>
          
          {/* Метод 1: Нативное приложение */}
          <div className="bg-primary/10 p-5 rounded-[2rem] border border-primary/20 space-y-4 text-left">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                <AppWindow className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-[12px] font-black text-white uppercase">Полноценное приложение (IPA)</p>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">Без ограничений браузера</p>
              </div>
            </div>
            <p className="text-[10px] text-white/60 leading-relaxed">
              Зайдите в GitHub Actions вашего проекта, скачайте файл <b>Nuxus.ipa</b> и установите его через AltStore или Scarlet. Это даст 100% стабильность.
            </p>
          </div>

          {/* Метод 2: Android APK */}
          <Link href="/download" className="block w-full">
            <div className="bg-[#A4C639]/10 p-5 rounded-[2rem] border border-[#A4C639]/20 space-y-4 text-left hover:bg-[#A4C639]/15 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#A4C639]/20 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-[#A4C639]" />
                </div>
                <div className="flex-1">
                  <p className="text-[12px] font-black text-white uppercase">Android Client (APK)</p>
                  <p className="text-[9px] text-muted-foreground uppercase font-bold">Прямая установка</p>
                </div>
              </div>
              <p className="text-[10px] text-white/60 leading-relaxed">
                Нажмите здесь, чтобы перейти на страницу загрузки APK файла для вашего Android-устройства.
              </p>
            </div>
          </Link>

          {/* Метод 3: PWA */}
          <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5 space-y-4 text-left">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <PlusSquare className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-[12px] font-black text-white uppercase">Быстрая установка (PWA)</p>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">Через меню «Поделиться»</p>
              </div>
            </div>
            <p className="text-[10px] text-white/40 leading-relaxed">
              Нажмите иконку <b>Share</b>, затем <b>«На экран Домой»</b>. Приложение появится на рабочем столе мгновенно.
            </p>
          </div>
        </div>

        <div className="mt-12 bg-[#1c1c1e] p-6 rounded-[2.5rem] w-full border border-white/5 text-left">
            <div className="flex items-center gap-2 mb-3 text-accent">
                <Info className="w-4 h-4" />
                <h3 className="text-[10px] font-black uppercase tracking-widest">Совет Оператора</h3>
            </div>
            <p className="text-[9px] text-muted-foreground leading-relaxed uppercase font-bold">
                Native-версия позволяет использовать Face ID без ограничений Safari и обеспечивает мгновенные уведомления.
            </p>
        </div>
      </div>
    </div>
  );
}
