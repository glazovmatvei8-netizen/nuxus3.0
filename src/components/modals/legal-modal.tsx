
"use client"

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, ShieldCheck, Scale, Globe, Lock, ShieldAlert, Cpu, Database, Server, Key, EyeOff, Gavel, Zap } from 'lucide-react';

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
              <><ShieldCheck className="w-6 h-6 text-primary" /> Политика конфиденциальности 2.0</>
            ) : (
              <><Scale className="w-6 h-6 text-accent" /> Условия использования 2.0</>
            )}
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Nuxus Kernel Legal Documentation v2.0 — Hyper-Quantum Edition
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 p-8">
          <div className="space-y-10 text-sm text-muted-foreground leading-relaxed font-medium">
            {type === 'privacy' ? (
              <>
                <section className="space-y-4">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2">
                    <Database className="w-4 h-4 text-primary" /> 1. ФУНДАМЕНТАЛЬНЫЕ ПРИНЦИПЫ ЯДРА
                  </h3>
                  <p>Ядро Nuxus оперирует на базе децентрализованной архитектуры и принципа абсолютной минимизации данных. Мы не являемся классическим мессенджером; мы — платформа маршрутизации зашифрованных сигналов. В рамках версии 2.0 мы внедрили протоколы нулевого разглашения (Zero-Knowledge Proofs), что гарантирует:</p>
                  <ul className="list-disc pl-5 space-y-3">
                    <li><b>Анонимность узла:</b> Мы не сопоставляем ваш номер телефона с вашей реальной личностью. Номер используется исключительно как идентификатор в сети Quantum Core.</li>
                    <li><b>Метаданные:</b> Система не сохраняет историю ваших подключений, IP-адресов или геолокацию в долгосрочной перспективе. Все метаданные удаляются автоматически после завершения сессии синхронизации.</li>
                    <li><b>Облачные зашифрованные контейнеры:</b> Ваша переписка хранится на серверах только в виде зашифрованных фрагментов, ключи к которым находятся исключительно на конечном устройстве пользователя.</li>
                  </ul>
                </section>

                <section className="space-y-4">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2">
                    <Key className="w-4 h-4 text-primary" /> 2. ТЕХНОЛОГИЯ QUANTUM ENCRYPTION
                  </h3>
                  <p>Все данные, передаваемые через Ядро Nuxus, защищены многослойным шифрованием. Мы используем комбинацию алгоритмов AES-256-GCM и пост-квантовой криптографии для обеспечения долгосрочной безопасности:</p>
                  <p>Это означает, что даже при использовании сверхмощных вычислительных систем в будущем, ваши текущие диалоги останутся защищенными. Ключи дешифрования генерируются локально и никогда не передаются в открытом виде через магистральные узлы Ядра.</p>
                  <p><b>ВНИМАНИЕ:</b> Оператор Ядра не имеет технической возможности восстановить ваш пароль или PIN-код 2FA. Утрата этих данных ведет к безвозвратной потере доступа к зашифрованному контейнеру сообщений.</p>
                </section>

                <section className="space-y-4">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-primary" /> 3. ТРЕТЬИ ЛИЦА И РАСКРЫТИЕ ДАННЫХ
                  </h3>
                  <p>Nuxus придерживается политики полной изоляции от рекламных сетей и систем слежения. Мы гарантируем, что:</p>
                  <ul className="list-disc pl-5 space-y-3">
                    <li>Ваши данные никогда не будут проданы или переданы аналитическим компаниям для профилирования.</li>
                    <li>Мы не интегрируем сторонние SDK (за исключением базовых сервисов Vercel для мониторинга стабильности бандла), которые могут собирать информацию в фоновом режиме.</li>
                    <li>Раскрытие информации государственным органам возможно только при наличии законного судебного ордера, признанного международным правом. Однако даже в этом случае мы сможем предоставить только зашифрованные фрагменты данных без ключей доступа.</li>
                  </ul>
                </section>

                <section className="space-y-4">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" /> 4. АВТОНОМНОЕ ХРАНЕНИЕ (OFFLINE KERNEL)
                  </h3>
                  <p>В версии 2.0 введена функция Offline Kernel. Это означает, что часть вашего профиля и кэш последних сообщений хранятся в защищенном хранилище вашего устройства (LocalStorage/IndexedDB). Мы рекомендуем использовать системные средства защиты устройства (FaceID/TouchID/Пароль), чтобы предотвратить несанкционированный физический доступ к этим данным.</p>
                </section>

                <section className="space-y-4">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2">
                    <Server className="w-4 h-4 text-primary" /> 5. УДАЛЕНИЕ И ПРАВО НА ЗАБВЕНИЕ
                  </h3>
                  <p>Вы обладаете полным суверенитетом над своим цифровым следом. В любой момент вы можете инициировать процедуру "Самоуничтожения Узла". Это приведет к:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Мгновенному удалению вашего профиля из глобального реестра Ядра.</li>
                    <li>Стиранию всех зашифрованных сообщений в личных чатах на сервере.</li>
                    <li>Аннулированию всех активных сессий на всех устройствах.</li>
                  </ul>
                </section>
              </>
            ) : (
              <>
                <section className="space-y-4">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2">
                    <Gavel className="w-4 h-4 text-accent" /> 1. СОГЛАСИЕ И ПРИНЯТИЕ УСЛОВИЙ
                  </h3>
                  <p>Использование программного комплекса Nuxus 2.0 (далее — "Ядро") означает ваше полное и безоговорочное согласие с данными условиями. Если вы не согласны хотя бы с одним из пунктов, вы обязаны немедленно прекратить использование приложения и удалить свой узел связи.</p>
                  <p>Настоящее соглашение является публичной офертой и может быть изменено администрацией Ядра в одностороннем порядке без предварительного уведомления пользователей.</p>
                </section>

                <section className="space-y-4">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-accent" /> 2. ПРАВИЛА ПОВЕДЕНИЯ И ОГРАНИЧЕНИЯ
                  </h3>
                  <p>Ядро Nuxus создано для обеспечения свободы слова и безопасной связи. Однако использование системы для совершения противоправных действий строго запрещено. К таким действиям относятся:</p>
                  <ul className="list-disc pl-5 space-y-3">
                    <li><b>Деструктивная деятельность:</b> Попытки взлома Ядра, проведение DDoS-атак на узлы системы, распространение вредоносного ПО.</li>
                    <li><b>Нарушение прав личности:</b> Массовая рассылка спама (Spamming), кибербуллинг, домогательства и разжигание ненависти.</li>
                    <li><b>Незаконный контент:</b> Распространение материалов, содержащих детскую порнографию, инструкции по изготовлению оружия или пропаганду терроризма.</li>
                    <li><b>Нарушение авторских прав:</b> Использование каналов и групп для массового распространения интеллектуальной собственности без согласия правообладателей.</li>
                  </ul>
                  <p>Администрация оставляет за собой право блокировать узлы (аккаунты), нарушающие данные правила, без права восстановления.</p>
                </section>

                <section className="space-y-4">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2">
                    <Lock className="w-4 h-4 text-accent" /> 3. ОТВЕТСТВЕННОСТЬ СТОРОН
                  </h3>
                  <p>Поскольку Nuxus является инструментом с глубоким шифрованием, вы несете полную и исключительную ответственность за контент, который вы передаете через систему. Администрация Ядра не осуществляет предварительную модерацию личных сообщений и не несет за них ответственности.</p>
                  <p>Система предоставляется по принципу "AS IS" (как есть). Мы не гарантируем 100% аптайм в условиях глобальных сбоев инфраструктуры интернета или атак на магистральные узлы. Мы также не несем ответственности за косвенные убытки, возникшие в результате использования или невозможности использования Ядра.</p>
                </section>

                <section className="space-y-4">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-accent" /> 4. ПРЕМИАЛЬНЫЕ ФУНКЦИИ И МОНЕТИЗАЦИЯ
                  </h3>
                  <p>Базовые функции общения в Nuxus всегда будут бесплатными. Мы оставляем за собой право вводить платные подписки (Nuxus Premium) для получения доступа к расширенным ресурсам Ядра (увеличенное облако, эксклюзивные статусы, приоритетная поддержка). Все платежи обрабатываются через защищенные шлюзы третьих лиц, и Nuxus не получает доступа к вашим банковским данным.</p>
                </section>

                <section className="space-y-4">
                  <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2">
                    <Globe className="w-4 h-4 text-accent" /> 5. ЮРИСДИКЦИЯ
                  </h3>
                  <p>Настоящее соглашение регулируется международными нормами права. В случае возникновения споров, стороны обязуются пытаться решить их путем переговоров в рамках цифровой этики Ядра Nuxus.</p>
                </section>
              </>
            )}
            <div className="pt-16 pb-10 text-center">
              <p className="text-[10px] uppercase font-black tracking-[0.4em] opacity-30">Nuxus — Технологии на страже вашей свободы</p>
              <p className="text-[8px] uppercase font-bold mt-2 opacity-20">BUILD 2.0.65 — QUANTUM READY</p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
