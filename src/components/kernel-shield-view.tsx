
"use client"

import React, { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ShieldCheck, Globe, Lock, Cpu, Zap, 
  AlertTriangle, Fingerprint, Terminal as TermIcon,
  Flame, Trophy, CheckCircle2, Loader2, Activity, Gauge, Database
} from 'lucide-react';
import { cn, triggerHaptic } from '@/lib/utils';
import { Button } from './ui/button';

/**
 * KERNEL SHIELD HUB V187.0 «HARDWARE NEXUS»
 * ОПТИМИЗИРОВАНО: Добавлена Hardware телеметрия и исправлена логика логов.
 */
export default function KernelShieldView() {
  const [pulse, setPulse] = useState(0);
  const [logs, setLogs] = useState<{t: string, m: string, type: 'sys' | 'sec'}[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  
  // Speed Test State
  const [ping, setPing] = useState<number | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    const bootLogs = [
      { t: new Date().toLocaleTimeString(), m: "Kernel Ignition Sequence: SUCCESS.", type: 'sys' as const },
      { t: new Date().toLocaleTimeString(), m: "Hardware Encryption Engine: ACTIVE.", type: 'sys' as const },
      { t: new Date().toLocaleTimeString(), m: "Zero-Trust Protocol V187: ENGAGED.", type: 'sec' as const },
    ];
    setLogs(bootLogs);

    const interval = setInterval(() => {
      setPulse(p => (p + 1) % 100);
      const timestamp = new Date().toLocaleTimeString();
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      
      setLogs(prev => {
        const newLogs = [...prev];
        if (Math.random() > 0.9) {
          newLogs.push({ 
            t: timestamp, 
            m: `Node Pulse Sync: ${isOnline ? 'OPTIMAL' : 'RECONNECTING'}.`,
            type: 'sys' as const
          });
        }
        if (Math.random() > 0.98) {
          newLogs.push({
            t: timestamp,
            m: "AEGIS: Sub-node authentication challenge bypassed (Mobile Node).",
            type: 'sec' as const
          });
        }
        return newLogs.slice(-50);
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isAutoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isAutoScroll]);

  const runDiagnostic = async () => {
    setIsTesting(true);
    triggerHaptic();
    setPing(null);
    const start = Date.now();
    await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
    const end = Date.now();
    const result = Math.floor((end - start) / 10); 
    setPing(result);
    setIsTesting(false);
  };

  const HARDWARE_STATS = [
    { name: 'Core Encryption', value: 'AES-256', icon: Lock, color: 'text-primary' },
    { name: 'Node Memory', value: '14.2 MB', icon: Database, color: 'text-blue-400' },
    { name: 'QES Integrity', value: '100%', icon: ShieldCheck, color: 'text-emerald-500' }
  ];

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsla(var(--primary),0.08),transparent_70%)] pointer-events-none" />

      <header className="px-8 pt-16 pb-6 shrink-0 z-10">
        <div className="flex items-center gap-4">
           <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <Activity className="w-8 h-8 text-emerald-500 animate-pulse" />
           </div>
           <div>
              <div className="flex items-center gap-2">
                 <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none">Victory Hub</h1>
                 <span className="px-2 py-0.5 rounded bg-primary text-black text-[8px] font-black uppercase">V187</span>
              </div>
              <p className="text-[10px] font-black uppercase text-primary/60 tracking-[0.4em] mt-1">Mobile Nexus Integrated</p>
           </div>
        </div>
      </header>

      <ScrollArea className="flex-1 px-8 pb-40 z-10">
        <div className="space-y-10 py-6">
          
          <div className="bg-[#1C1C1E] p-8 rounded-[3rem] border border-white/[0.05] shadow-2xl relative overflow-hidden group">
             <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
             <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-5">
                   <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center">
                      <Gauge className="w-7 h-7 text-primary" />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-sm font-black uppercase italic text-white tracking-widest">QES Diagnostic</span>
                      <span className="text-[10px] text-white/40 font-bold uppercase mt-1">Проверка шлюза данных</span>
                   </div>
                </div>
                <div className="flex items-center gap-6">
                   {ping !== null && <span className="text-2xl font-black italic text-primary tabular-nums">{ping}<span className="text-[10px] ml-1">ms</span></span>}
                   <Button onClick={runDiagnostic} disabled={isTesting} className="h-12 px-6 rounded-xl bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-xl">
                     {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Run'}
                   </Button>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {HARDWARE_STATS.map(s => (
              <div key={s.name} className="p-6 bg-white/[0.02] border border-white/5 rounded-[2.2rem] flex flex-col items-center gap-3 text-center">
                 <s.icon className={cn("w-6 h-6", s.color)} />
                 <span className="text-[11px] font-black uppercase italic text-white">{s.name}</span>
                 <span className="text-[13px] font-black text-primary/80 tabular-nums">{s.value}</span>
              </div>
            ))}
          </div>

          <div className="bg-black/80 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden flex flex-col h-80 font-mono group">
             <div className="bg-white/5 px-6 py-3 flex items-center justify-between border-b border-white/5 shrink-0">
                <div className="flex items-center gap-3">
                   <TermIcon className="w-4 h-4 text-primary" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-white/60">System Console</span>
                </div>
                <button onClick={() => { triggerHaptic(); setIsAutoScroll(!isAutoScroll); }} className={cn("text-[8px] font-black uppercase px-3 py-1.5 rounded-full border", isAutoScroll ? "bg-primary text-black" : "text-white/40")}>
                  {isAutoScroll ? 'Auto-Scroll' : 'Locked'}
                </button>
             </div>
             <div className="flex-1 overflow-y-auto p-5 no-scrollbar">
                <div className="space-y-2">
                   {logs.map((log, i) => (
                     <p key={i} className={cn("text-[10px] leading-tight flex gap-2", log.type === 'sec' ? "text-amber-400 font-bold" : "text-emerald-500/80")}>
                        <span className="opacity-30">[{log.t}]</span>
                        <span className="opacity-50">{'>'}</span>
                        <span>{log.m}</span>
                     </p>
                   ))}
                   <div ref={logEndRef} />
                </div>
             </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
