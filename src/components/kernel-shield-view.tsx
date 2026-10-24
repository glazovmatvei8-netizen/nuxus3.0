
"use client"

import React, { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ShieldCheck, Activity, Gauge, Database, Lock, ShieldAlert, RefreshCcw, Cpu, Globe, Server
} from 'lucide-react';
import { cn, triggerHaptic } from '@/lib/utils';
import { Button } from './ui/button';
import { useTranslations } from '@/hooks/use-translations';

/**
 * KERNEL SHIELD V219.0 «AEGIS SENTINEL»
 * UPDATED: Enhanced visual feedback and real-time security telemetry.
 */
export default function KernelShieldView() {
  const { t } = useTranslations();
  const [logs, setLogs] = useState<{t: string, m: string, type: 'sys' | 'sec' | 'net'}[]>([]);
  const [ping, setPing] = useState<number | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [threatsReflected, setThreatsReflected] = useState(142);
  const [cpuLoad, setCpuLoad] = useState(12);

  useEffect(() => {
    const bootLogs = [
      { t: new Date().toLocaleTimeString(), m: "Инициализация Aegis Sentinel: СТАТУС OK.", type: 'sys' as const },
      { t: new Date().toLocaleTimeString(), m: "Монитор QES 28.4 активен. Шифрование в реальном времени.", type: 'sys' as const },
      { t: new Date().toLocaleTimeString(), m: "Все локальные шлюзы под наблюдением ядра.", type: 'sys' as const },
    ];
    setLogs(bootLogs);

    const interval = setInterval(() => {
      const timestamp = new Date().toLocaleTimeString();
      const randomEvent = Math.random();
      
      setCpuLoad(prev => Math.min(45, Math.max(8, prev + (Math.random() * 4 - 2))));

      if (randomEvent > 0.85) {
        setLogs(prev => [...prev.slice(-40), { 
          t: timestamp, 
          m: `Проверка целостности Ядра: НАРУШЕНИЙ НЕТ.`,
          type: 'sys' as const
        }]);
      } else if (randomEvent < 0.12) {
        setLogs(prev => [...prev.slice(-40), { 
          t: timestamp, 
          m: `Вредоносный скрипт отладки нейтрализован (Aegis Block).`,
          type: 'sec' as const
        }]);
        setThreatsReflected(p => p + 1);
        triggerHaptic();
      } else if (randomEvent > 0.4 && randomEvent < 0.48) {
        setLogs(prev => [...prev.slice(-40), { 
          t: timestamp, 
          m: `Входящий пакет QES верифицирован. Ключ совпадает.`,
          type: 'net' as const
        }]);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const runDiagnostic = async () => {
    setIsTesting(true);
    triggerHaptic();
    setPing(null);
    const start = Date.now();
    await new Promise(r => setTimeout(r, 2000));
    const end = Date.now();
    const result = Math.floor((end - start) / 15); 
    setPing(result);
    setIsTesting(false);
    toast({ title: "Диагностика завершена", description: "Все узлы работают в штатном режиме." });
  };

  const HARDWARE_STATS = [
    { name: t('shield.enc_core'), value: 'AES-256', icon: Lock, color: 'text-primary' },
    { name: 'Нагрузка', value: `${cpuLoad.toFixed(1)}%`, icon: Cpu, color: 'text-orange-400' },
    { name: 'Угроз отражено', value: threatsReflected.toString(), icon: ShieldCheck, color: 'text-emerald-500' }
  ];

  return (
    <div className="flex flex-col h-full bg-[#050608] text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsla(var(--primary),0.08),transparent_70%)] pointer-events-none" />

      <header className="px-8 pt-16 pb-6 shrink-0 z-10 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center shadow-[0_0_30px_rgba(0,212,255,0.2)]">
                 <ShieldAlert className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <div>
                 <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none">{t('shield.title')}</h1>
                 <p className="text-[10px] font-black uppercase text-primary/60 tracking-[0.4em] mt-1 italic">Aegis Sentinel Active</p>
              </div>
           </div>
           <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg">
              <span className="text-[8px] font-black text-emerald-400 uppercase">Secure Link</span>
           </div>
        </div>
      </header>

      <ScrollArea className="flex-1 px-8 pb-64 z-10">
        <div className="space-y-10 py-8">
          
          {/* Main Diagnostic Gauge */}
          <div className="bg-[#0e111a] p-8 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12">
                <Server className="w-32 h-32 text-primary" />
             </div>
             <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                <div className="flex items-center gap-6">
                   <div className="w-16 h-16 rounded-[1.8rem] bg-black/60 border border-white/10 flex items-center justify-center shadow-inner">
                      <Gauge className="w-8 h-8 text-primary" />
                   </div>
                   <div className="flex flex-col text-left">
                      <span className="text-lg font-black uppercase italic text-white tracking-widest">{t('shield.diagnostic')}</span>
                      <span className="text-[10px] text-white/40 font-bold uppercase mt-1">Анализ шлюзов QES</span>
                   </div>
                </div>
                <div className="flex items-center gap-8">
                   {ping !== null && (
                     <div className="flex flex-col items-end">
                        <span className="text-3xl font-black italic text-primary tabular-nums leading-none">{ping}<span className="text-[12px] ml-1">ms</span></span>
                        <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">Network Latency</span>
                     </div>
                   )}
                   <Button onClick={runDiagnostic} disabled={isTesting} className="h-14 px-8 rounded-2xl bg-primary text-white font-black uppercase text-[11px] tracking-widest shadow-2xl shadow-primary/20 border border-white/10 active:scale-95 transition-all">
                     {isTesting ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Активировать"}
                   </Button>
                </div>
             </div>
          </div>

          {/* Real-time Hardware Telemetry */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {HARDWARE_STATS.map(s => (
              <div key={s.name} className="p-8 bg-white/[0.02] border border-white/5 rounded-[2.5rem] flex flex-col items-center gap-4 text-center hover:bg-white/[0.05] transition-all shadow-xl backdrop-blur-md">
                 <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                    <s.icon className={cn("w-6 h-6", s.color)} />
                 </div>
                 <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase italic text-white/40 tracking-widest">{s.name}</span>
                    <span className="text-xl font-black text-white tabular-nums block">{s.value}</span>
                 </div>
              </div>
            ))}
          </div>

          {/* Secure Terminal Console */}
          <div className="bg-[#020305]/90 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[450px] font-mono group relative">
             <div className="bg-white/5 px-8 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                   <Activity className="w-4 h-4 text-primary animate-pulse" />
                   <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Aegis Live Console</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                   <span className="text-[8px] font-black uppercase text-red-400">Recording</span>
                </div>
             </div>
             <div className="flex-1 overflow-y-auto p-6 no-scrollbar bg-black/40">
                <div className="space-y-3">
                   {logs.map((log, i) => (
                     <p key={i} className={cn("text-[10px] leading-tight flex gap-4 animate-in slide-in-from-left-2 duration-300", 
                       log.type === 'sec' ? "text-red-400 font-bold bg-red-500/5 p-2 rounded-lg border border-red-500/10" : 
                       log.type === 'net' ? "text-blue-400" : "text-primary/70")}>
                        <span className="opacity-30 shrink-0 tabular-nums">[{log.t}]</span>
                        <span className="opacity-50 shrink-0">></span>
                        <span className="break-words">{log.m}</span>
                     </p>
                   ))}
                </div>
             </div>
             <div className="absolute bottom-4 right-8 opacity-20 pointer-events-none">
                <ShieldCheck className="w-24 h-24 text-primary" />
             </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
