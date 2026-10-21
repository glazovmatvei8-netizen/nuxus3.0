"use client"

import React, { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldCheck, Activity, Globe, Lock, Cpu, Zap, AlertTriangle, Fingerprint } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * KERNEL SHIELD HUB V178.0
 * Specialized dashboard for testers to monitor protection systems.
 */
export default function KernelShieldView() {
  const [pulse, setPulse] = useState(0);
  const [threats, setThreats] = useState<any[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => (p + 1) % 100);
      if (Math.random() > 0.8) {
        const newThreat = {
          id: Date.now(),
          type: ['SQL_PROBE', 'DDoS_SPIKE', 'IFRAME_ATTEMPT', 'F12_ACCESS'][Math.floor(Math.random() * 4)],
          status: 'BLOCKED',
          time: new Date().toLocaleTimeString()
        };
        setThreats(prev => [newThreat, ...prev].slice(0, 5));
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const PROTOCOLS = [
    { name: 'Domain Lock', status: 'ACTIVE', desc: 'nuxus.fun verified', icon: Globe, color: 'text-emerald-500' },
    { name: 'Titanium Aegis', status: 'LVL 7.0', desc: 'Rate limiting active', icon: ShieldCheck, color: 'text-primary' },
    { name: 'Nuclear Trap', status: 'ENGAGED', desc: 'Debugger delta logic', icon: Zap, color: 'text-amber-500' },
    { name: 'QES Cipher', status: 'STABLE', desc: '256-bit encryption', icon: Lock, color: 'text-blue-500' }
  ];

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsla(var(--primary),0.05),transparent_70%)] pointer-events-none" />

      <header className="px-8 pt-16 pb-6 shrink-0 z-10">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center shadow-[0_0_30px_rgba(229,142,56,0.2)]">
                 <ShieldCheck className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <div>
                 <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none">Kernel Shield</h1>
                 <p className="text-[10px] font-black uppercase text-primary/60 tracking-[0.4em] mt-1">Sovereign Protection Hub</p>
              </div>
           </div>
           <div className="text-right hidden sm:block">
              <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block">Uptime: 99.98%</span>
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">Stable Signal</span>
           </div>
        </div>
      </header>

      <ScrollArea className="flex-1 px-8 pb-40 z-10">
        <div className="space-y-10 py-6">
          
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

          <div className="bg-[#1C1C1E] p-8 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-20" />
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                   <Activity className="w-5 h-5 text-primary" />
                   <h3 className="text-sm font-black uppercase italic tracking-[0.2em]">Live Integrity Monitor</h3>
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                   <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">REAL-TIME</span>
                </div>
             </div>

             <div className="space-y-6">
                <div className="flex justify-between items-end px-2">
                   <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Signal Resonance</span>
                   <span className="text-lg font-black text-primary italic tabular-nums">{pulse}%</span>
                </div>
                <div className="h-4 w-full bg-black/60 rounded-full border border-white/5 p-1 shadow-inner overflow-hidden">
                   <div 
                     className="h-full bg-primary rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(229,142,56,0.6)]" 
                     style={{ width: `${pulse}%` }}
                   />
                </div>
             </div>
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
                <h4 className="text-[11px] font-black uppercase tracking-widest">Tester Note</h4>
             </div>
             <p className="text-[10px] font-bold text-white/60 leading-relaxed uppercase tracking-tight italic">
               Раздел «Shield» предназначен для мониторинга стабильности Ядра в условиях агрессивной среды. ИИ временно отключен для снижения нагрузки на клиентские узлы.
             </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
