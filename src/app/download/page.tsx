
"use client"

import React from 'react';
import { NuxusLogo } from '@/components/nuxus-logo';
import { Button } from '@/components/ui/button';
import { X, Download, ShieldCheck, Zap, ArrowLeft, Smartphone, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * NUXUS DOWNLOAD HUB V1.1
 * Оптимизация: Удален маскот, исправлена прокрутка и наложения.
 */
export default function DownloadPage() {
  const handleDownload = () => {
    // Ждем прямую ссылку от пользователя
    alert("Инициализация загрузки APK... (Ожидание прямой ссылки от Оператора)");
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#020205] text-white relative overflow-hidden flex flex-col">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
      
      {/* Top Header - Fixed Layer */}
      <div className="w-full flex justify-between items-center p-8 relative z-[100] shrink-0">
        <Link href="/">
           <button className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all shadow-xl backdrop-blur-xl">
             <ArrowLeft className="w-6 h-6 text-white/60" />
           </button>
        </Link>
        <div className="flex flex-col items-end">
           <span className="text-[8px] font-black uppercase tracking-[0.4em] text-primary">Nuxus Kernel</span>
           <span className="text-[10px] font-bold text-white/20 uppercase">v33.2.1</span>
        </div>
      </div>

      {/* Main Content - Scrollable Area */}
      <ScrollArea className="flex-1 w-full">
        <div className="flex flex-col items-center justify-center gap-12 p-8 pt-4 pb-32 w-full max-w-lg mx-auto text-center relative z-10">
          
          {/* Header Brand */}
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-1000">
             <div className="hover:scale-105 transition-transform duration-700 flex justify-center">
                <NuxusLogo size={160} />
             </div>
             <h1 className="text-6xl font-black italic tracking-tighter uppercase leading-none text-white drop-shadow-[0_0_30px_rgba(168,85,247,0.3)]">NUXUS</h1>
             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 italic">Ядро следит за вашей безопасностью</p>
          </div>

          {/* Clean Features Grid */}
          <div className="grid grid-cols-1 gap-4 w-full">
             <FeatureItem icon={ShieldCheck} title="QES Encryption" desc="Сквозное квантовое шифрование сигналов" />
             <FeatureItem icon={Zap} title="Direct Core Link" desc="Прямая связь с узлами без посредников" />
             <FeatureItem icon={Smartphone} title="Native UI" desc="100% плавность и поддержка Face ID" />
          </div>

          {/* Action Area */}
          <div className="w-full space-y-6 pt-4">
            <Button 
              onClick={handleDownload}
              className="w-full h-20 bg-gradient-to-r from-[#007AFF] to-[#AF52DE] text-white rounded-[2rem] font-black uppercase italic tracking-[0.2em] text-lg shadow-[0_20px_60px_rgba(0,122,255,0.4)] active:scale-95 transition-all group overflow-hidden border border-white/10"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              <Download className="w-6 h-6 mr-3 animate-bounce" /> Скачать APK
            </Button>
            
            <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">Версия клиента: Alpha-Pulse 33.2</p>
          </div>

          {/* Legal Footer Info */}
          <div className="pt-10 space-y-4 opacity-30">
             <div className="flex items-center justify-center gap-6">
                <ShieldCheck className="w-4 h-4" />
                <Smartphone className="w-4 h-4" />
                <Zap className="w-4 h-4" />
             </div>
             <p className="text-[7px] text-white uppercase font-bold tracking-widest leading-relaxed max-w-[280px] mx-auto">
               0+. ООО «Nuxus Quantum Platforms». Протокол QES 25.4. Все права защищены.
             </p>
          </div>
        </div>
      </ScrollArea>

      {/* Floating Close Button (Desktop Style) */}
      <Link href="/">
        <button className="fixed top-8 right-8 h-12 w-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-red-500/20 hover:border-red-500/40 transition-all z-[200] active:scale-90 backdrop-blur-xl">
          <X className="w-6 h-6" />
        </button>
      </Link>
    </div>
  );
}

function FeatureItem({ icon: Icon, title, desc }: any) {
  return (
    <div className="flex items-center gap-5 p-5 bg-white/[0.03] border border-white/5 rounded-[1.8rem] text-left hover:bg-white/[0.05] transition-all group">
       <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 group-hover:scale-110 transition-transform">
         <Icon className="w-6 h-6 text-primary" />
       </div>
       <div className="flex flex-col gap-0.5">
          <span className="text-[12px] font-black uppercase text-white tracking-widest">{title}</span>
          <span className="text-[10px] text-white/40 font-bold uppercase">{desc}</span>
       </div>
       <ChevronRight className="w-4 h-4 ml-auto text-white/10" />
    </div>
  )
}
