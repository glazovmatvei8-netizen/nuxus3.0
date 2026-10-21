
"use client"

import React, { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ShieldCheck, Activity, Globe, Lock, Cpu, Zap, 
  AlertTriangle, Fingerprint, Terminal, Terminal as TermIcon,
  Flame, Trophy, CheckCircle2
} from 'lucide-react';
import { cn, triggerHaptic } from '@/lib/utils';

/**
 * KERNEL SHIELD HUB V179.0 «VICTORY PULSE»
 * Specialized dashboard for testers. Added System Terminal and Victory Celebration.
 */
export default function KernelShieldView() {
  const [pulse, setPulse] = useState(0);
  const [threats, setThreats] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => (p + 1) % 100);
      
      // Simulate real-time logs
      const timestamp = new Date().toLocaleTimeString();
      const newLog = `[${timestamp}] Kernel Integrity Check: OK. QES Signal: Stable.`;
      setLogs(prev => [...prev, newLog].slice(-15));

      if (Math.random() > 0.85) {
        const type = ['SQL_PROBE', 'DDoS_SPIKE', 'IFRAME_ATTEMPT', 'F12_ACCESS', 'BRUTE_FORCE'][Math.floor(Math.random() * 5)];
        const newThreat = {
          id: Date.now(),
          type,
          status: 'BLOCKED',
          time: timestamp
        };
        setThreats(prev => [newThreat, ...prev].slice(0, 5));
        setLogs(prev => [...prev, `[${timestamp}] CRITICAL: ${type} intercepted and neutralized by Aegis.`].slice(-15));
        triggerHaptic();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const PROTOCOLS = [
    { name: 'Domain Lock', status: 'ACTIVE', desc: 'nuxus.fun verified', icon: Globe, color: 'text-emerald-500' },
    { name: 'Titanium Aegis', status: 'LVL 8.0', desc: 'Anti-Brute active', icon: ShieldCheck, color: 'text-primary' },
    { name: 'Nuclear Trap', status: 'ENGAGED', desc: 'Debugger delta logic', icon: Zap, color: 'text-amber-500' },
    { name: 'QES Cipher', status: 'STABLE', desc: '256-bit encryption', icon: Lock, color: 'text-blue-500' }
  ];

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsla(var(--primary),0.08),transparent_70%)] pointer-events-none" />

      <header className="px-8 pt-16 pb-6 shrink-0 z-10">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                 <Trophy className="w-8 h-8 text-emerald-500 animate-bounce" />
              </div>
              <div>
                 <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none">Victory Hub</h1>
                    <span className="px-2 py-0.5 rounded bg-primary text-black text-[8px] font-black uppercase">PRO</span>
                 </div>
                 <p className="text-[10px] font-black uppercase text-primary/60 tracking-[0.4em] mt-1">Sovereign Protection Active</p>
              </div>
           </div>
           <div className="text-right hidden sm:block">
              <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block">Victory Integrity: 100%</span>
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">All Nodes Secure</span>
           </div>
        </div>
      </header>

      <ScrollArea className="flex-1 px-8 pb-40 z-10">
        <div className="space-y-10 py-6">
          
          {/* Victory Card */}
          <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-[2.5rem] flex items-center gap-6 shadow-2xl relative overflow-hidden group">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1)_0%,transparent_70%)]" />
             <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30 relative z-10">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
             </div>
             <div className="flex flex-col relative z-10">
                <span className="text-xl font-black uppercase italic text-white leading-tight">Защита укреплена</span>
                <span className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest mt-1">Все атаки успешно отражены</span>
             </div>
             <Flame className="absolute -right-4 -bottom-4 w-24 h-24 text-emerald-500/10 rotate-12 group-hover:scale-110 transition-transform duration-1000" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PROTOCOLS.map(p => (
              <div key={p.name} className="p-6 bg-white/[0.02] border border-white/5 rounded-[2.5rem] flex items-center gap-6 group hover:border-primary/20 transition-all shadow-xl">
                 <div className="w-12 h-12 rounded-2xl bg-black/40 flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
                    <p.icon className={cn("w-6 h-6", p.color)} />
                 </div>
                 <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                       <span className="text-[13px] font-black uppercase italic tracking-widest">{p.name}</span>
                       <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-lg bg-black/60", p.color)}>{p.status}</span>
                    </div>
                    <span className="text-[10px] font-bold text-white/30 uppercase mt-1 truncate">{p.desc}</span>
                 </div>
              </div>
            ))}
          </div>

          {/* System Terminal Log */}
          <div className="bg-black/80 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden flex flex-col h-64 font-mono">
             <div className="bg-white/5 px-6 py-3 flex items-center gap-3 border-b border-white/5 shrink-0">
                <TermIcon className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">System Terminal V1.0</span>
             </div>
             <ScrollArea className="flex-1 p-5">
                <div className="space-y-1.5">
                   {logs.map((log, i) => (
                     <p key={i} className={cn(
                       "text-[10px] leading-tight",
                       log.includes('CRITICAL') ? "text-red-400" : "text-emerald-500/80"
                     )}>
                        <span className="opacity-40">{'>'}</span> {log}
                     </p>
                   ))}
                   <div ref={logEndRef} />
                </div>
             </ScrollArea>
          </div>

          <div className="space-y-4">
             <h3 className="text-[11px] font-black uppercase text-muted-foreground tracking-[0.3em] italic px-2">Aegis Event Log</h3>
             <div className="bg-[#1C1C1E]/50 rounded-[2.5rem] border border-white/[0.03] overflow-hidden divide-y divide-white/[0.03]">
                {threats.length > 0 ? threats.map(t => (
                  <div key={t.id} className="p-5 flex items-center justify-between bg-transparent hover:bg-white/[0.01] transition-all">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                           <AlertTriangle className="w-4 h-4 text-red-500" />
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[12px] font-black text-white uppercase italic">{t.type}</span>
                           <span className="text-[8px] text-white/20 font-bold uppercase tracking-widest">{t.time}</span>
                        </div>
                     </div>
                     <span className="text-[9px] font-black text-red-400 uppercase tracking-[0.2em]">{t.status}</span>
                  </div>
                )) : (
                  <div className="p-12 text-center opacity-20 flex flex-col items-center gap-4">
                     <Fingerprint className="w-12 h-12" />
                     <p className="text-[10px] font-black uppercase tracking-[0.4em]">Listening for signals...</p>
                  </div>
                )}
             </div>
          </div>

          <div className="p-8 bg-primary/5 border border-primary/20 rounded-[2.5rem] space-y-4">
             <div className="flex items-center gap-3 text-primary">
                <Cpu className="w-5 h-5" />
                <h4 className="text-[11px] font-black uppercase tracking-widest">Victory Protocol Note</h4>
             </div>
             <p className="text-[10px] font-bold text-white/60 leading-relaxed uppercase tracking-tight italic">
               Версия V179.0 официально подтверждает полную суверенность Ядра. ИИ полностью аннигилирован для обеспечения максимальной скорости работы. Защита от брутфорса переведена в активный режим.
             </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
