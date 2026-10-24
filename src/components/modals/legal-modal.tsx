"use client"

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldCheck, Lock, Scale, Copyright, Globe } from 'lucide-react';
import versions from '@/app/versions.json';

export function LegalModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#0a0a0c] border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl h-[85vh] z-[3000] outline-none">
        <DialogHeader className="p-8 border-b border-white/5 bg-gradient-to-r from-primary/10 to-transparent">
          <DialogTitle className="text-xl font-black uppercase italic text-white flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-primary" /> Правовой Департамент MIG
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            MIG Kernel v{versions.latestVersion} — Legal & Compliance
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 p-8">
          <div className="space-y-8 text-[12px] leading-relaxed text-white/80 uppercase font-bold tracking-tight">
            
            <section className="space-y-4 p-6 bg-primary/5 border border-primary/20 rounded-3xl">
              <h3 className="text-primary font-black flex items-center gap-2 italic">
                <Copyright className="w-4 h-4" /> ИНТЕЛЛЕКТУАЛЬНАЯ СОБСТВЕННОСТЬ
              </h3>
              <p className="text-white font-black">
                ВСЕ ПРАВА НА ПРИЛОЖЕНИЕ, ИСХОДНЫЙ КОД, ДИЗАЙН И ТОРГОВУЮ МАРКУ ПРИНАДЛЕЖАТ КОМАНДЕ MIG.
              </p>
              <p className="opacity-70">
                Любое несанкционированное копирование или имитация работы Ядра преследуется по законам цифровой защиты. MIG является единственным законным владельцем и оператором данной платформы.
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="text-primary font-black flex items-center gap-2"><Lock className="w-4 h-4" /> КОНФИДЕНЦИАЛЬНОСТЬ</h3>
              <p>Система MIG обеспечивает мгновенную передачу зашифрованных сигналов. Данные не передаются третьим лицам.</p>
            </section>
            
            <div className="pt-10 text-center opacity-40">
               <p className="text-[10px] font-black tracking-[0.5em]">© MIG 2024</p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
