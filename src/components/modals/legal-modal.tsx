
"use client"

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, ShieldCheck, Scale } from 'lucide-react';

interface LegalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'privacy' | 'terms';
}

export function LegalModal({ open, onOpenChange, type }: LegalModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#0a0a0c] border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl flex flex-col h-[80vh]">
        <DialogHeader className="p-6 border-b border-white/5 shrink-0">
          <DialogTitle className="text-xl font-black uppercase italic text-white flex items-center gap-3">
            {type === 'privacy' ? (
              <><ShieldCheck className="w-6 h-6 text-primary" /> Политика конфиденциальности</>
            ) : (
              <><Scale className="w-6 h-6 text-accent" /> Условия использования</>
            )}
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Nuxus Kernel Legal Documentation v1.0
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 p-8">
          <div className="space-y-6 text-sm text-muted-foreground leading-relaxed font-medium">
            {type === 'privacy' ? (
              <>
                <section className="space-y-3">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" /> 1. Сбор данных
                  </h3>
                  <p>Nuxus собирает только минимально необходимую информацию для функционирования Ядра: ваш номер телефона (или логин), псевдоним и технические метаданные сессии.</p>
                </section>
                <section className="space-y-3">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" /> 2. Шифрование
                  </h3>
                  <p>Ваши сообщения защищены протоколами Quantum Core. Мы не храним открытые ключи на наших серверах. Все медиафайлы сжимаются и шифруются перед загрузкой в облако.</p>
                </section>
                <section className="space-y-3">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" /> 3. Передача третьим лицам
                  </h3>
                  <p>Ядро Nuxus является автономным. Мы никогда не продаем и не передаем ваши личные данные рекламным агентствам или государственным структурам без законного ордера.</p>
                </section>
                <section className="space-y-3">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" /> 4. Ваши права
                  </h3>
                  <p>Вы имеете право на полное удаление своего узла (аккаунта) из Ядра в любой момент. После удаления все связанные сообщения и медиа стираются без возможности восстановления.</p>
                </section>
              </>
            ) : (
              <>
                <section className="space-y-3">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full" /> 1. Принятие условий
                  </h3>
                  <p>Используя Nuxus, вы подтверждаете, что вам исполнилось 12 лет и вы согласны соблюдать данные правила сетевого этикета.</p>
                </section>
                <section className="space-y-3">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full" /> 2. Запрещенный контент
                  </h3>
                  <p>В Ядре запрещена трансляция материалов, нарушающих законодательство РФ и международные нормы, включая пропаганду насилия, терроризма и спам-рассылки.</p>
                </section>
                <section className="space-y-3">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full" /> 3. Ограничение ответственности
                  </h3>
                  <p>Команда разработчиков Nuxus не несет ответственности за содержание пользовательских чатов и возможные убытки, возникшие в результате использования мессенджера.</p>
                </section>
                <section className="space-y-3">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full" /> 4. Модификации
                  </h3>
                  <p>Мы оставляем за собой право обновлять Ядро и правила использования. Ваше дальнейшее использование системы означает принятие обновленных условий.</p>
                </section>
              </>
            )}
            <div className="pt-10 pb-6 text-center">
              <p className="text-[10px] uppercase font-black tracking-[0.3em] opacity-30">Nuxus — Технологии на вашей стороне</p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
