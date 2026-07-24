
"use client"

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ShieldCheck, Scale, Lock, Database, HelpCircle, MessageCircle, Zap, ShieldAlert, FileText, Globe } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/lib/store';
import versions from '@/app/versions.json';

export function LegalModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const { setInspectedUserId } = useAppState();

  const handleContactSupport = () => {
    setInspectedUserId('GCvLucN8CjNcdaxPO2vmpZ84hNl1');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#0a0a0c] border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl flex flex-col h-[85vh] outline-none">
        <DialogHeader className="p-8 border-b border-white/5 shrink-0 bg-gradient-to-r from-primary/10 to-transparent">
          <DialogTitle className="text-xl font-black uppercase italic text-white flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-primary" /> Правовой Департамент
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mt-1">
            Nuxus Kernel v{versions.latestVersion} — Legal & Compliance
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="privacy" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-2 shrink-0">
            <TabsList className="grid grid-cols-3 bg-white/5 p-1 rounded-2xl border border-white/5">
              <TabsTrigger value="privacy" className="rounded-xl text-[9px] font-black uppercase tracking-widest">Конфиденциальность</TabsTrigger>
              <TabsTrigger value="faq" className="rounded-xl text-[9px] font-black uppercase tracking-widest">База знаний</TabsTrigger>
              <TabsTrigger value="legal" className="rounded-xl text-[9px] font-black uppercase tracking-widest">Условия</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="privacy" className="flex-1 m-0 overflow-hidden data-[state=active]:flex flex-col">
            <ScrollArea className="flex-1 p-8">
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-4 text-primary">
                   <Lock className="w-6 h-6" />
                   <h3 className="text-lg font-black uppercase italic tracking-tight">Политика Nuxus.fun</h3>
                </div>
                
                <div className="space-y-6 text-[12px] leading-relaxed text-white/80 uppercase font-bold tracking-tight">
                  <section className="space-y-2">
                    <p className="text-primary/60 font-black">1. ОБЩИЕ ПОЛОЖЕНИЯ</p>
                    <p>Настоящая Политика определяет порядок обработки персональных данных пользователей мобильного приложения Nuxus.fun. Цель политики — обеспечение защиты прав и свобод человека при обработке его данных.</p>
                  </section>

                  <section className="space-y-2">
                    <p className="text-primary/60 font-black">2. КАКИЕ ДАННЫЕ МЫ СОБИРАЕМ</p>
                    <p>Для работы мессенджера мы собираем только самые необходимые данные, которые вы вводите сами:</p>
                    <ul className="list-disc pl-5 space-y-1 text-white/60">
                       <li>Номер телефона (используется как уникальный логин для входа).</li>
                       <li>Пароль в зашифрованном виде (для защиты вашего аккаунта).</li>
                       <li>Текстовые сообщения, медиафайлы и реакции в чатах.</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <p className="text-primary/60 font-black">3. РЕГИОНАЛЬНЫЕ ОГРАНИЧЕНИЯ</p>
                    <p className="text-red-500">Приложение Nuxus.fun не оказывает услуги и не позволяет регистрировать новые узлы с территории Российской Федерации (РФ) для обеспечения безопасности данных основной сети.</p>
                  </section>

                  <section className="space-y-2">
                    <p className="text-primary/60 font-black">4. БЕЗОПАСНОСТЬ И ПЕРЕДАЧА</p>
                    <p>Мы не продаем и не передаем ваши данные третьим лицам. Все переписки хранятся на защищенных узлах.</p>
                  </section>

                  <section className="space-y-2">
                    <p className="text-primary/60 font-black">5. УДАЛЕНИЕ ДАННЫХ</p>
                    <p>Каждый пользователь имеет право на полное удаление своего аккаунта (Аннигиляция Узла) через настройки приложения.</p>
                  </section>
                </div>

                <div className="pt-8 border-t border-white/5 opacity-40">
                   <p className="text-[9px] font-black text-center uppercase tracking-widest">Последнее обновление: Июль 2026</p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="faq" className="flex-1 m-0 overflow-hidden data-[state=active]:flex flex-col">
            <ScrollArea className="flex-1 p-8">
              <div className="space-y-6">
                <h3 className="text-white font-black uppercase tracking-[0.2em] flex items-center gap-3 text-sm">
                  <HelpCircle className="w-5 h-5 text-primary" /> База знаний
                </h3>
                
                <Accordion type="single" collapsible className="space-y-2">
                  <AccordionItem value="item-1" className="border-white/5 px-4 rounded-2xl bg-white/[0.02]">
                    <AccordionTrigger className="text-[11px] font-bold uppercase text-white/80 hover:no-underline">Как работает шифрование QES?</AccordionTrigger>
                    <AccordionContent className="text-[10px] text-muted-foreground leading-relaxed">
                      Все ваши текстовые сообщения шифруются актуальным протоколом QES v{versions.qesVersion} на вашем устройстве. Только получатель имеет ключ для дешифровки.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2" className="border-white/5 px-4 rounded-2xl bg-white/[0.02]">
                    <AccordionTrigger className="text-[11px] font-bold uppercase text-white/80 hover:no-underline">Почему мой номер (+7) недоступен?</AccordionTrigger>
                    <AccordionContent className="text-[10px] text-muted-foreground leading-relaxed">
                      Ядро Nuxus временно ограничило регистрацию новых узлов из РФ для соблюдения международных протоколов безопасности данных.
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
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
