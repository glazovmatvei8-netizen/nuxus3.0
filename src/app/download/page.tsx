
"use client"

import React from 'react';
import { NuxusLogo } from '@/components/nuxus-logo';
import { Button } from '@/components/ui/button';
import { X, Download, ShieldCheck, Zap, ArrowLeft, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * NUXUS DOWNLOAD HUB V1.0
 * Стиль: Cinema Fidelity / Bear Mascot Reference
 */
export default function DownloadPage() {
  const handleDownload = () => {
    // Ждем ссылку на APK от пользователя. Пока имитируем старт.
    alert("Инициализация загрузки APK... (Ожидание прямой ссылки)");
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#020205] text-white relative overflow-hidden flex flex-col items-center justify-between p-8">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.12)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
      
      {/* Top Header */}
      <div className="w-full flex justify-between items-center relative z-20">
        <Link href="/">
           <button className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all shadow-xl">
             <ArrowLeft className="w-6 h-6 text-white/60" />
           </button>
        </Link>
        <div className="flex flex-col items-end">
           <span className="text-[8px] font-black uppercase tracking-[0.4em] text-primary">Nuxus Kernel</span>
           <span className="text-[10px] font-bold text-white/20 uppercase">v33.2.0</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-12 relative z-10 w-full max-w-sm text-center">
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-1000">
           <div className="hover:scale-105 transition-transform duration-700">
              <NuxusLogo size={180} />
           </div>
           <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">NUXUS</h1>
           <p className="text-xs font-black uppercase tracking-[0.3em] text-primary/60 italic">Ядро следит за вашей безопасностью</p>
        </div>

        {/* Mascot Area (Bear placeholder) */}
        <div className="relative w-full aspect-square max-w-[280px] group">
           <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full animate-pulse-glow" />
           <img 
             src="https://picsum.photos/seed/nuxusbear/600/600" 
             alt="Nuxus Mascot" 
             className="w-full h-full object-contain relative z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] group-hover:scale-105 transition-transform duration-1000"
             data-ai-hint="3D bear mascot holding phone"
           />
           <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-xl border border-white/10 px-4 py-1.5 rounded-full z-20 shadow-2xl">
              <span className="text-[8px] font-black uppercase tracking-widest text-accent">Master Node Active</span>
           </div>
        </div>

        {/* Action Button */}
        <Button 
          onClick={handleDownload}
          className="w-full h-20 bg-gradient-to-r from-[#007AFF] to-[#AF52DE] text-white rounded-[2rem] font-black uppercase italic tracking-[0.2em] text-lg shadow-[0_20px_60px_rgba(0,122,255,0.4)] active:scale-95 transition-all group overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          <Download className="w-6 h-6 mr-3 animate-bounce" /> Скачать APK
        </Button>
      </div>

      {/* Footer Legal (from reference) */}
      <div className="relative z-20 text-center space-y-4 pb-4">
         <div className="flex items-center justify-center gap-6 opacity-30">
            <ShieldCheck className="w-4 h-4" />
            <Smartphone className="w-4 h-4" />
            <Zap className="w-4 h-4" />
         </div>
         <p className="text-[7px] text-white/20 uppercase font-bold tracking-widest leading-relaxed max-w-[280px]">
           0+. Реклама. Рекламодатель: ООО «Nuxus Quantum Platforms» (ИНН 7724123456). Соглашение: https://nuxus.chat/legal. 
           Протокол QES 25.4.
         </p>
      </div>

      {/* Close Cross (Floating) */}
      <Link href="/">
        <button className="fixed top-8 right-8 h-12 w-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-red-500/20 hover:border-red-500/40 transition-all z-[100] active:scale-90">
          <X className="w-6 h-6" />
        </button>
      </Link>
    </div>
  );
}
