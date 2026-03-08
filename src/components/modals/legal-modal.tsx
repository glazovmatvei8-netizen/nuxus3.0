
"use client"

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, ShieldCheck, Scale, Globe, Lock, ShieldAlert, Cpu, Database } from 'lucide-react';

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
            Nuxus Kernel Legal Documentation v1.2 — Hyper-Quantum Edition
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 p-8">
          <div className="space-y-8 text-sm text-muted-foreground leading-relaxed font-medium">
            {type === 'privacy' ? (
              <>
                <section className="space-y-4">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2">
                    <Database className="w-4 h-4 text-primary" /> 1. Сбор и обработка данных
                  </h3>
                  <p>Ядро Nuxus оперирует принципом минимизации данных. Мы собираем только те сведения, которые критически необходимы для обеспечения связи между узлами (пользователями):</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><b>Идентификатор узла:</b> Ваш уникальный системный ID и номер телефона (или логин), используемые исключительно для маршрутизации сообщений.</li>
                    <li><b>Метаданные сессии:</b> Время последнего входа, IP-адрес (для защиты от ботов) и версия клиентского ПО.</li>
                    <li><b>Профильные данные:</b> Имя, никнейм и био, которые вы добровольно указываете в настройках Ядра.</li>
                  </ul>
                </section>

                <section className="space-y-4">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2">
                    <Lock className="w-4 h-4 text-primary" /> 2. Технология Quantum Encryption
                  </h3>
                  <p>Ваши сообщения и медиафайлы защищены протоколами сквозного шифрования Quantum Core. Это означает:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><b>Отсутствие доступа у провайдера:</b> Мы не имеем технической возможности расшифровать ваши диалоги. Ключи дешифровки хранятся только на ваших устройствах.</li>
                    <li><b>Локальное хранилище:</b> История переписки кэшируется на устройстве в зашифрованном контейнере.</li>
                    <li><b>Медиа-безопасность:</b> Все фотографии и видео сжимаются и шифруются перед передачей через магистральные узлы Ядра.</li>
                  </ul>
                </section>

                <section className="space-y-4">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" /> 3. Передача и раскрытие информации
                  </h3>
                  <p>Nuxus является автономной экосистемой. Мы придерживаемся политики Zero-Knowledge:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Мы никогда не продаем ваши данные рекламным сетям или аналитическим компаниям.</li>
                    <li>Раскрытие информации государственным органам возможно только при наличии законного судебного ордера в юрисдикции функционирования серверов, однако даже в этом случае содержимое переписки останется зашифрованным.</li>
                    <li>Мы не передаем списки контактов третьим лицам. Ваша телефонная книга используется только локально для поиска других узлов.</li>
                  </ul>
                </section>

                <section className="space-y-4">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-primary" /> 4. Ваши права и удаление данных
                  </h3>
                  <p>Вы обладаете полным суверенитетом над своим цифровым следом в Ядре Nuxus:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><b>Право на забвение:</b> Вы можете инициировать полное удаление своего аккаунта в настройках. При этом все ваши сообщения в личных чатах будут удалены безвозвратно.</li>
                    <li><b>Управление доступом:</b> Вы в любой момент можете изменить настройки видимости номера и статуса активности.</li>
                    <li><b>Портативность:</b> Вы можете запросить выгрузку своих данных в машиночитаемом формате (JSON).</li>
                  </ul>
                </section>
              </>
            ) : (
              <>
                <section className="space-y-4">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-accent" /> 1. Согласие с условиями
                  </h3>
                  <p>Используя программный комплекс Nuxus, вы вступаете в юридически значимое соглашение с оператором Ядра. Если вы не согласны с любым из пунктов, вы обязаны немедленно прекратить использование приложения и удалить свой узел.</p>
                  <p>Минимальный возраст для использования системы — 12 лет (или возраст, установленный законодательством вашей страны для самостоятельного использования социальных сервисов).</p>
                </section>

                <section className="space-y-4">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2">
                    <Scale className="w-4 h-4 text-accent" /> 2. Кодекс поведения в Ядре
                  </h3>
                  <p>Запрещается использовать Nuxus для совершения противоправных действий, включая, но не ограничиваясь:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Распространение материалов, содержащих сцены насилия, детскую порнографию или пропаганду терроризма.</li>
                    <li>Организация массовых спам-рассылок и автоматизированный сбор данных других пользователей.</li>
                    <li>Нарушение авторских прав и интеллектуальной собственности третьих лиц.</li>
                    <li>Попытки дестабилизации работы Ядра, взлома протоколов шифрования или несанкционированного доступа к чужим узлам.</li>
                  </ul>
                </section>

                <section className="space-y-4">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2">
                    <Globe className="w-4 h-4 text-accent" /> 3. Ограничение ответственности
                  </h3>
                  <p>Nuxus предоставляется по принципу «как есть» (AS IS). Разработчики и операторы Ядра не несут ответственности за:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Содержимое пользовательских чатов, групп и каналов. Ответственность за контент несет исключительно отправитель.</li>
                    <li>Утрату доступа к аккаунту в случае потери PIN-кода 2FA или пароля.</li>
                    <li>Косвенные убытки, возникшие в результате временной неработоспособности Ядра или сбоев в работе сетей передачи данных.</li>
                  </ul>
                </section>

                <section className="space-y-4">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-accent" /> 4. Монетизация и обновления
                  </h3>
                  <p>Мессенджер Nuxus является бесплатным для базового использования. Мы оставляем за собой право внедрять платные «Premium» функции, которые не влияют на безопасность основных коммуникаций.</p>
                  <p>Ядро постоянно эволюционирует. Мы можем вносить изменения в архитектуру и правила использования без предварительного уведомления, однако обязуемся публиковать обновленные версии документов в данном разделе.</p>
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
