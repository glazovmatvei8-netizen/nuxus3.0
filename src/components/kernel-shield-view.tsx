"use client"

import React, { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ShieldCheck, Activity, Gauge, Database, Lock, ShieldAlert, RefreshCcw
} from 'lucide-react';
import { cn, triggerHaptic } from '@/lib/utils';
import { Button } from './ui/button';
import { useTranslations } from '@/hooks/use-translations';

export default function KernelShieldView() {
  const { t } = useTranslations();
  const [logs, setLogs] = useState<{t: string, m: string, type: 'sys' | 'sec' | 'net'}[]>([]);
  const [ping, setPing] = useState<number | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [threatsReflected, setThreatsReflected] = useState(142);

  useEffect(() => {
    const bootLogs = [
      { t: new Date().toLocaleTimeString(), m: "Инициализация Aegis Shield: УСПЕШНО.", type: 'sys' as const },
      { t: new Date().toLocaleTimeString(), m: "Монитор защиты MIG активен. Протокол QES 28.4.", type: 'sys' as const },
      { t: new Date().toLocaleTimeString(), m: "Все шлюзы под наблюдением.", type: 'sys' as const },
    ];
    setLogs(bootLogs);

    const interval = setInterval(() => {
      const timestamp = new Date().toLocaleTimeString();
      const randomEvent = Math.random();
      
      if (randomEvent > 0.8) {
        setLogs(prev => [...prev.slice(-40), { 
          t: timestamp, 
          m: `Проверка целостности Ядра: ОШИБОК НЕТ.`,
          type: 'sys' as const
        }]);
      } else if (randomEvent < 0.15) {
        setLogs(prev => [...prev.slice(-40), { 
          t: timestamp, 
          m: `Попытка несанкционированной отладки нейтрализована.`,
          type: 'sec' as const
        }]);
        setThreatsReflected(p => p + 1);
        triggerHaptic();
      } else if (randomEvent > 0.4 && randomEvent < 0.5) {
        setLogs(prev => [...prev.slice(-40), { 
          t: timestamp, 
          m: `Входящий сигнал QES: Верифицирован.`,
          type: 'net' as const
        }]);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  const runDiagnostic = async () => {
    setIsTesting(true);
    triggerHaptic();
    setPing(null);
    const start = Date.now();
    await new Promise(r => setTimeout(r, 1500));
    const end = Date.now();
    const result = Math.floor((end - start) / 12); 
    setPing(result);
    setIsTesting(false);
  };

  const HARDWARE_STATS = [
    { name: t('shield.enc_core'), value: 'AES-256', icon: Lock, color: 'text-primary' },
    { name: t('shield.mem_node'), value: '18.4 MB', icon: Database, color: 'text-blue-400' },
    { name: 'Угроз отражено', value: threatsReflected.toString(), icon: ShieldCheck, color: 'text-emerald-500' }
  ];

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsla(var(--primary),0.08),transparent_70%)] pointer-events-none" />

      <header className="px-8 pt-16 pb-6 shrink-0 z-10">
        <div className="flex items-center gap-4">
           <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center shadow-[0_0_30px_rgba(0,212,255,0.2)]">
              <Activity className="w-8 h-8 text-primary animate-pulse" />
           </div>
           <div>
              <div className="flex items-center gap-2">
                 <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none">{t('shield.title')}</h1>
                 <span className="px-2 py-0.5 rounded bg-primary text-black text-[8px] font-black uppercase shadow-lg shadow-primary/20">LIVE</span>
              </div>
              <p className="text-[10px] font-black uppercase text-primary/60 tracking-[0.4em] mt-1 italic">Ядро MIG активно</p>
           </div>
        </div>
      </header>

      <ScrollArea className="flex-1 px-8 pb-64 z-10">
        <div className="space-y-10 py-6">
          <div className="bg-[#151518] p-8 rounded-[3rem] border border-white/[0.05] shadow-2xl relative overflow-hidden group">
             <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
             <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-5">
                   <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center">
                      <Gauge className="w-7 h-7 text-primary" />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-sm font-black uppercase italic text-white tracking-widest">{t('shield.diagnostic')}</span>
                      <span className="text-[10px] text-white/40 font-bold uppercase mt-1">Проверка шлюза QES</span>
                   </div>
                </div>
                <div className="flex items-center gap-6">
                   {ping !== null && <span className="text-2xl font-black italic text-primary tabular-nums">{ping}<span className="text-[10px] ml-1">ms</span></span>}
                   <Button onClick={runDiagnostic} disabled={isTesting} className="h-12 px-6 rounded-xl bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-xl border border-white/10 active:scale-95 transition-all">
                     {isTesting ? <RefreshCcw className="w-4 h-4 animate-spin" /> : t('shield.run')}
                   </Button>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {HARDWARE_STATS.map(s => (
              <div key={s.name} className="p-6 bg-white/[0.02] border border-white/5 rounded-[2.2rem] flex flex-col items-center gap-3 text-center hover:bg-white/[0.05] transition-all">
                 <s.icon className={cn("w-6 h-6", s.color)} />
                 <span className="text-[10px] font-black uppercase italic text-white/60">{s.name}</span>
                 <span className="text-[14px] font-black text-white tabular-nums">{s.value}</span>
              </div>
            ))}
          </div>

          <div className="bg-black/80 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden flex flex-col h-[400px] font-mono group relative">
             <div className="bg-white/5 px-6 py-3 flex items-center justify-between border-b border-white/5 shrink-0">
                <div className="flex items-center gap-3">
                   <ShieldAlert className="w-4 h-4 text-primary" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{t('shield.terminal')}</span>
                </div>
                <div className="text-[8px] font-black uppercase px-3 py-1.5 rounded-full border bg-white/5 text-white/40 border-white/10">
                  {t('shield.locked')}
                </div>
             </div>
             <div className="flex-1 overflow-y-auto p-5 no-scrollbar bg-black/40">
                <div className="space-y-2">
                   {logs.map((log, i) => (
                     <p key={i} className={cn("text-[10px] leading-tight flex gap-3 animate-in slide-in-from-left-2 duration-300", 
                       log.type === 'sec' ? "text-red-400 font-bold" : 
                       log.type === 'net' ? "text-blue-400" : "text-primary/70")}>
                        <span className="opacity-30 shrink-0">[{log.t}]</span>
                        <span className="opacity-50 shrink-0">></span>
                        <span className="break-words">{log.m}</span>
                     </p>
                   ))}
                </div>
             </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}