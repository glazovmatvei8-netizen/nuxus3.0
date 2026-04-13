
"use client"

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ShieldCheck, Scale, Lock, Database, HelpCircle, MessageCircle, Zap, ShieldAlert } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/lib/store';

export function LegalModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void, type?: 'privacy' | 'terms' }) {
  const { setInspectedUserId } = useAppState();

  const handleContactSupport = () => {
    // Открываем профиль главного администратора
    setInspectedUserId('GCvLucN8CjNcdaxPO2vmpZ84hNl1');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#0a0a0c] border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl flex flex-col h-[85vh] outline-none">
        <DialogHeader className="p-6 border-b border-white/5 shrink-0">
          <DialogTitle className="text-xl font-black uppercase italic text-white flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-primary" /> База Знаний Ядра
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Nuxus Kernel v4.1.2 — Technical Support
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="faq" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-2 shrink-0">
            <TabsList className="grid grid-cols-2 bg-white/5 p-1 rounded-2xl">
              <TabsTrigger value="faq" className="rounded-xl text-[10px] font-black uppercase tracking-widest">База знаний</TabsTrigger>
              <TabsTrigger value="legal" className="rounded-xl text-[10px] font-black uppercase tracking-widest">Юридическая инфо</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="faq" className="flex-1 m-0 overflow-hidden data-[state=active]:flex flex-col">
            <ScrollArea className="flex-1 p-8">
              <div className="space-y-6">
                <h3 className="text-white font-black uppercase tracking-[0.2em] flex items-center gap-3 text-sm">
                  <HelpCircle className="w-5 h-5 text-primary" /> Часто задаваемые вопросы
                </h3>
                
                <Accordion type="single" collapsible className="space-y-2">
                  <AccordionItem value="item-1" className="border-white/5 px-4 rounded-2xl bg-white/[0.02]">
                    <AccordionTrigger className="text-[11px] font-bold uppercase text-white/80 hover:no-underline">Как работает шифрование QES?</AccordionTrigger>
                    <AccordionContent className="text-[10px] text-muted-foreground leading-relaxed">
                      Все ваши текстовые сообщения шифруются протоколом QES на вашем устройстве. Только получатель имеет ключ для дешифровки. Ядро видит только зашифрованный шум.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2" className="border-white/5 px-4 rounded-2xl bg-white/[0.02]">
                    <AccordionTrigger className="text-[11px] font-bold uppercase text-white/80 hover:no-underline">Как получить статус Premium?</AccordionTrigger>
                    <AccordionContent className="text-[10px] text-muted-foreground leading-relaxed">
                      Статус Premium открывает доступ к ИИ-видео, кастомным цветам и расшифровке голоса. Для активации обратитесь к Оператору Ядра.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3" className="border-white/5 px-4 rounded-2xl bg-white/[0.02]">
                    <AccordionTrigger className="text-[11px] font-bold uppercase text-white/80 hover:no-underline">Что такое Signal QR?</AccordionTrigger>
                    <AccordionContent className="text-[10px] text-muted-foreground leading-relaxed">
                      Это ваш персональный идентификатор. При сканировании другим пользователем, он мгновенно попадает в ваш профиль для начала защищенного чата.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="p-6 bg-primary/10 rounded-3xl border border-primary/20 mt-8 space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-[11px] font-black uppercase text-white">Нужна прямая помощь?</h4>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold leading-relaxed">Нажмите кнопку ниже, чтобы открыть чат с Администратором Ядра.</p>
                  </div>
                  <Button 
                    onClick={handleContactSupport}
                    className="w-full h-12 bg-primary text-white rounded-xl font-black uppercase tracking-widest gap-2 shadow-lg shadow-primary/20"
                  >
                    <MessageCircle className="w-4 h-4" /> Связаться с Оператором
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="legal" className="flex-1 m-0 overflow-hidden data-[state=active]:flex flex-col">
            <ScrollArea className="flex-1 p-8">
              <div className="space-y-10 text-sm text-muted-foreground font-medium">
                <section className="space-y-4">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2"><Scale className="w-4 h-4 text-primary" /> УСЛОВИЯ ИСПОЛЬЗОВАНИЯ</h3>
                  <div className="text-[11px] leading-relaxed space-y-2 uppercase font-bold">
                    <p>1. СОГЛАШЕНИЕ: ИСПОЛЬЗУЯ NUXUS, ВЫ ПОДТВЕРЖДАЕТЕ СОГЛАСИЕ С ЦИФРОВЫМ РЕГЛАМЕНТОМ.</p>
                    <p>2. КОНТЕНТ: ВЫ НЕСЕТЕ ПОЛНУЮ ОТВЕТСТВЕННОСТЬ ЗА ЛЮБОЙ ПЕРЕДАВАЕМЫЙ СИГНАЛ.</p>
                    <p>3. БЕЗОПАСНОСТЬ: ЗАПРЕЩЕНЫ ЛЮБЫЕ ПОПЫТКИ ВЗЛОМА ИЛИ ДЕСТАБИЛИЗАЦИИ ЯДРА.</p>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2"><Lock className="w-4 h-4 text-primary" /> КОНФИДЕНЦИАЛЬНОСТЬ</h3>
                  <div className="text-[11px] leading-relaxed space-y-2 uppercase font-bold">
                    <p>МЫ НЕ СОБИРАЕМ ВАШИ ДАННЫЕ ДЛЯ РЕКЛАМЫ. ВСЯ ИНФОРМАЦИЯ ШИФРУЕТСЯ И ПРИНАДЛЕЖИТ ТОЛЬКО ВАМ.</p>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2"><Database className="w-4 h-4 text-primary" /> ДАННЫЕ</h3>
                  <p className="text-[10px] uppercase font-bold">Логи IP-адресов удаляются автоматически после завершения каждой сессии.</p>
                </section>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
