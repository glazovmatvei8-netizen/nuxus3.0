
"use client"

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FileText, ShieldCheck, Scale, Globe, Lock, ShieldAlert, Cpu, Database, Server, Key, EyeOff, Gavel, Zap, Info, HelpCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export function LegalModal({ open, onOpenChange, type }: { open: boolean, onOpenChange: (o: boolean) => void, type: 'privacy' | 'terms' }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#0a0a0c] border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl flex flex-col h-[85vh]">
        <DialogHeader className="p-6 border-b border-white/5 shrink-0">
          <DialogTitle className="text-xl font-black uppercase italic text-white flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-primary" /> База Знаний Ядра
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Nuxus Kernel v2.9.0 — Help & Support Center
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
                    <AccordionTrigger className="text-[11px] font-bold uppercase text-white/80 hover:no-underline">Как работает сквозное шифрование (E2EE)?</AccordionTrigger>
                    <AccordionContent className="text-[10px] text-muted-foreground leading-relaxed">
                      Все ваши текстовые сообщения шифруются протоколом QES на вашем устройстве. Только получатель имеет ключ для дешифровки пакета. Ядро (сервер) видит только зашифрованный шум.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2" className="border-white/5 px-4 rounded-2xl bg-white/[0.02]">
                    <AccordionTrigger className="text-[11px] font-bold uppercase text-white/80 hover:no-underline">Почему лимит медиа — 100 МБ?</AccordionTrigger>
                    <AccordionContent className="text-[10px] text-muted-foreground leading-relaxed">
                      Для обеспечения высокой скорости синхронизации и стабильности на мобильных устройствах мы установили лимит в 100 МБ для высококачественных фото и видео (HQ).
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3" className="border-white/5 px-4 rounded-2xl bg-white/[0.02]">
                    <AccordionTrigger className="text-[11px] font-bold uppercase text-white/80 hover:no-underline">Как работает реферальная программа?</AccordionTrigger>
                    <AccordionContent className="text-[10px] text-muted-foreground leading-relaxed">
                      Вы можете скопировать свою уникальную ссылку в профиле. За каждого нового пользователя, активировавшего аккаунт по вашей ссылке, вы получаете бонусные баллы активности в Ядре.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10 mt-8">
                  <h4 className="text-[10px] font-black uppercase text-primary mb-2">Нужна прямая поддержка?</h4>
                  <p className="text-[9px] text-muted-foreground uppercase font-bold leading-relaxed">Отправьте сообщение в чат @nuxus_support или обратитесь к Оператору Ядра через тикет-систему.</p>
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
                    <p>1. СОГЛАШЕНИЕ С УСЛОВИЯМИ: ИСПОЛЬЗУЯ NUXUS KERNEL, ВЫ ПОДТВЕРЖДАЕТЕ СВОЕ СОГЛАСИЕ С ДАННЫМИ ПРАВИЛАМИ.</p>
                    <p>2. ОТВЕТСТВЕННОСТЬ: ПОЛЬЗОВАТЕЛЬ НЕСЕТ ПОЛНУЮ ОТВЕТСТВЕННОСТЬ ЗА ПЕРЕДАВАЕМЫЙ КОНТЕНТ. ЯДРО ОБЕСПЕЧИВАЕТ ТРАНСПОРТНУЮ БЕЗОПАСНОСТЬ.</p>
                    <p>3. ПРАВИЛА СООБЩЕСТВА: ЗАПРЕЩЕНА ЛЮБАЯ ДЕЯТЕЛЬНОСТЬ, НАРУШАЮЩАЯ ЦЕЛОСТНОСТЬ СИСТЕМЫ ИЛИ ПРАВА ДРУГИХ ПОЛЬЗОВАТЕЛЕЙ.</p>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2"><Lock className="w-4 h-4 text-primary" /> ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ</h3>
                  <div className="text-[11px] leading-relaxed space-y-2 uppercase font-bold">
                    <p>1. МИНИМИЗАЦИЯ ДАННЫХ: МЫ НЕ ХРАНИМ ВАШИ СООБЩЕНИЯ В ОТКРЫТОМ ВИДЕ. ВСЕ ДАННЫЕ ШИФРУЮТСЯ КЛИЕНТСКИМ КЛЮЧОМ.</p>
                    <p>2. IP-АДРЕСА: ЛОГИ IP-АДРЕСОВ ИСПОЛЬЗУЮТСЯ ТОЛЬКО ДЛЯ ПРЕДОТВРАЩЕНИЯ АТАК И УДАЛЯЮТСЯ ПОСЛЕ ЗАВЕРШЕНИЯ СЕССИИ.</p>
                    <p>3. ТРЕТЬИ ЛИЦА: ВАШИ ДАННЫЕ НИКОГДА НЕ ПЕРЕДАЮТСЯ РЕКЛАМНЫМ АГЕНТСТВАМ ИЛИ СТОРОННИМ СЕРВИСАМ.</p>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2"><Database className="w-4 h-4 text-primary" /> ПРИНЦИПЫ ЯДРА</h3>
                  <p>Ядро Nuxus оперирует на базе децентрализованной архитектуры. Все метаданные обрабатываются в режиме реального времени и не подлежат долгосрочному хранению на физических носителях.</p>
                </section>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
