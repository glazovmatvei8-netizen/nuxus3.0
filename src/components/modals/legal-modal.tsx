"use client"

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldCheck, Lock, HelpCircle, Scale, Copyright } from 'lucide-react';
import versions from '@/app/versions.json';

/**
 * LEGAL MODAL V6.2.0 «STRICT OWNERSHIP»
 * UPDATED: Explicitly states Nuxus as the legal owner and code holder.
 */
export function LegalModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#0a0a0c] border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl flex flex-col h-[85vh] z-[3000]">
        <DialogHeader className="p-8 border-b border-white/5 bg-gradient-to-r from-primary/10 to-transparent">
          <DialogTitle className="text-xl font-black uppercase italic text-white flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-primary" /> Правовой Департамент
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Nuxus Kernel v{versions.latestVersion} — Legal & Compliance
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 p-8">
          <div className="space-y-8 text-[12px] leading-relaxed text-white/80 uppercase font-bold tracking-tight">
            
            <section className="space-y-4 p-6 bg-primary/5 border border-primary/20 rounded-3xl">
              <h3 className="text-primary font-black flex items-center gap-2 italic">
                <Copyright className="w-4 h-4" /> ИНТЕЛЛЕКТУАЛЬНАЯ СОБСТВЕННОСТЬ
              </h3>
              <p className="text-white font-black">
                ВСЕ ПРАВА НА ПРИЛОЖЕНИЕ, ИСХОДНЫЙ КОД, ДИЗАЙН И ТОРГОВУЮ МАРКУ ПРИНАДЛЕЖАТ КОМАНДЕ NUXUS.
              </p>
              <p className="opacity-70">
                Любое несанкционированное копирование или имитация работы Ядра преследуется по законам цифровой защиты. Nuxus является единственным законным владельцем и оператором данной платформы.
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="text-primary font-black flex items-center gap-2"><Lock className="w-4 h-4" /> ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ</h3>
              <p>1. ОБЩИЕ ПОЛОЖЕНИЯ: Настоящая Политика определяет порядок обработки данных в приложении Nuxus.fun.</p>
              <p>2. КАКИЕ ДАННЫЕ МЫ СОБИРАЕМ: Номер телефона, пароль в зашифрованном виде, сообщения и медиафайлы (исключительно для доставки).</p>
              <p>3. ЦЕЛИ ОБРАБОТКИ: Данные нужны для создания аккаунта, авторизации и обеспечения работы мессенджера.</p>
              <p>4. БЕЗОПАСНОСТЬ: Мы не продаем и не передаем данные третьим лицам. Все хранится на защищенных узлах.</p>
              <p>5. УДАЛЕНИЕ ДАННЫХ: Пользователь имеет право на полное удаление (Аннигиляцию) аккаунта через настройки.</p>
            </section>
            
            <section className="space-y-4 pt-4 border-t border-white/5">
              <h3 className="text-primary font-black flex items-center gap-2"><Scale className="w-4 h-4" /> РЕГИОНАЛЬНЫЕ ОГРАНИЧЕНИЯ</h3>
              <p className="text-red-500">Nuxus.fun не оказывает услуги пользователям с территории РФ (+7) для защиты целостности сети.</p>
            </section>

            <div className="pt-10 text-center opacity-40">
               <p className="text-[10px] font-black tracking-[0.5em]">© NUXUS 2024</p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
