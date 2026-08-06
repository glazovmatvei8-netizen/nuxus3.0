
"use client"

import React, { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Code2, Zap, Rocket, ShieldCheck, Cpu, Globe, ArrowRight, 
  MessageSquare, Bot, Sparkles, Terminal, Key, Webhook, 
  Layers, Copy, Check, Info, FileCode, Server, Cloud, LayoutGrid,
  Activity, BarChart3, Settings, Database, Loader2, Users, RefreshCcw, Trash2, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NuxusLogo } from './nuxus-logo';
import { useToast } from '@/hooks/use-toast';

/**
 * PARTNER HUB V2.6 «EXECUTIVE CONSOLE»
 * FIXED: Added missing 'Users' import and refined layout.
 */
export default function PartnerView() {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('docs');

  // Симуляция данных консоли
  const [stats, setStats] = useState({
    signals: 4280,
    players: 125,
    uptime: '99.9%',
    latency: '45ms'
  });

  const generateToken = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setToken(`nx_live_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`);
      setIsGenerating(false);
      toast({ title: "Bot Token Generated", description: "Используйте этот ключ для доступа к API." });
    }, 1500);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="flex flex-col h-full bg-[#020205] overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1)_0%,transparent_60%)] pointer-events-none" />
      
      <header className="px-6 pt-12 pb-6 shrink-0 z-30 flex items-center justify-between bg-[#020205]">
         <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-xl">
               <Code2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex flex-col text-left">
               <h1 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">Partner Hub</h1>
               <span className="text-[7px] font-black text-primary/40 uppercase tracking-[0.4em] mt-1">Nuxus Dev Engine v2.6</span>
            </div>
         </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="px-6 mb-4 relative z-30">
           <TabsList className="grid grid-cols-2 bg-white/5 p-1 rounded-2xl border border-white/5">
             <TabsTrigger value="docs" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary">Documentation</TabsTrigger>
             <TabsTrigger value="console" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary">Bot Console</TabsTrigger>
           </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 pb-40 animate-in fade-in duration-700">
            
            <TabsContent value="docs" className="m-0 space-y-10">
              <div className="text-center space-y-4">
                 <div className="flex justify-center mb-6">
                    <div className="relative">
                       <div className="absolute -inset-10 bg-primary/20 blur-[60px] rounded-full animate-pulse" />
                       <NuxusLogo size={140} />
                    </div>
                 </div>
                 <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-tight">
                   Build on <span className="text-primary">NUXUS</span>
                 </h2>
                 <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.3em] max-w-xs mx-auto leading-relaxed">
                   Облачная инфраструктура для Духа Стихий и других проектов.
                 </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="p-5 bg-white/[0.03] border border-white/10 rounded-[1.8rem] flex flex-col gap-3 shadow-lg text-left">
                    <Server className="w-6 h-6 text-primary" />
                    <h4 className="text-[10px] font-black uppercase text-white tracking-widest">24/7 Availability</h4>
                    <p className="text-[8px] text-white/40 font-bold uppercase leading-relaxed">Serverless шлюзы — бот всегда в сети.</p>
                 </div>
                 <div className="p-5 bg-white/[0.03] border border-white/10 rounded-[1.8rem] flex flex-col gap-3 shadow-lg text-left">
                    <Cloud className="w-6 h-6 text-accent" />
                    <h4 className="text-[10px] font-black uppercase text-white tracking-widest">Global Edge</h4>
                    <p className="text-[8px] text-white/40 font-bold uppercase leading-relaxed">Доставка через узлы Vercel и Firebase CDN.</p>
                 </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 p-6 rounded-[2.5rem] space-y-4 shadow-xl">
                 <div className="flex items-center gap-3">
                    <LayoutGrid className="w-5 h-5 text-primary" />
                    <h3 className="text-xs font-black uppercase text-white italic tracking-widest">Bot Keyboards</h3>
                 </div>
                 <p className="text-[9px] text-white/60 font-medium leading-relaxed uppercase text-left">
                    Поддержка интерактивных кнопок прямо в чате. Отправляйте JSON `keyboard` для взаимодействия.
                 </p>
                 <div className="bg-black/60 p-4 rounded-2xl font-mono text-[8px] text-primary/80 overflow-x-auto text-left">
                    <pre>{`"keyboard": {
  "rows": [
    [{ "text": "⚔️ Атака", "color": "destructive" }],
    [{ "text": "🎒 Инвентарь" }, { "text": "✨ Магия" }]
  ]
}`}</pre>
                 </div>
              </div>

              <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative overflow-hidden group">
                 <div className="flex items-center gap-4 mb-2">
                    <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
                       <Key className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col text-left">
                       <h3 className="text-sm font-black text-white uppercase italic tracking-widest">Bot Identity</h3>
                       <span className="text-[8px] text-white/30 uppercase font-black">Управление доступом</span>
                    </div>
                 </div>
                 
                 {token ? (
                   <div className="space-y-4 animate-in zoom-in-95 duration-300">
                      <div className="bg-black/60 p-4 rounded-2xl border border-primary/40 flex items-center justify-between gap-4">
                         <code className="text-primary text-[10px] font-mono truncate flex-1 text-left">{token}</code>
                         <button onClick={() => copyToClipboard(token)} className="text-white/40 hover:text-primary transition-colors"><Copy className="w-4 h-4" /></button>
                      </div>
                   </div>
                 ) : (
                   <Button 
                    onClick={generateToken} 
                    disabled={isGenerating}
                    className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all"
                   >
                      {isGenerating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />} 
                      {isGenerating ? 'Инициализация...' : 'Generate API Key'}
                   </Button>
                 )}
              </div>
            </TabsContent>

            <TabsContent value="console" className="m-0 space-y-8">
               <div className="grid grid-cols-2 gap-4">
                  <StatCard icon={Activity} label="Signals" value={stats.signals} color="text-primary" />
                  <StatCard icon={Users} label="Active Users" value={stats.players} color="text-accent" />
                  <StatCard icon={ShieldCheck} label="Uptime" value={stats.uptime} color="text-green-500" />
                  <StatCard icon={Zap} label="Latency" value={stats.latency} color="text-yellow-500" />
               </div>

               <div className="bg-black/60 border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col font-mono shadow-2xl">
                  <div className="bg-white/5 p-4 flex items-center justify-between border-b border-white/5">
                     <div className="flex items-center gap-3">
                        <Terminal className="w-4 h-4 text-primary" />
                        <span className="text-[10px] text-white/40 uppercase font-black">Signal Logs</span>
                     </div>
                     <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[8px] text-green-500 font-black uppercase">Live</span>
                     </div>
                  </div>
                  <div className="p-5 text-[10px] text-left space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide">
                     <p className="text-white/30">[08:42:15] <span className="text-primary">INFO</span>: Bot identified as @spirit_of_the_elements</p>
                     <p className="text-white/30">[08:43:02] <span className="text-accent">SIGNAL</span>: POST /api/bot (200 OK)</p>
                     <p className="text-white/30">[08:43:05] <span className="text-primary">EXEC</span>: Send Keyboard to chat_9482</p>
                     <p className="text-white/30">[08:44:11] <span className="text-yellow-500">WARN</span>: Latency spike detected (120ms)</p>
                     <p className="text-white/30">[08:45:00] <span className="text-green-500">SYNC</span>: All nodes stable</p>
                  </div>
               </div>

               <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 px-1 text-left">Quick Actions</h3>
                  <div className="grid grid-cols-1 gap-3">
                     <ActionButton icon={RefreshCcw} label="Reboot Bot Engine" />
                     <ActionButton icon={Trash2} label="Clear Memory Cache" />
                     <ActionButton icon={Database} label="Backup Player Data" />
                  </div>
               </div>
            </TabsContent>

          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="bg-white/[0.03] border border-white/5 p-5 rounded-[2rem] flex flex-col items-center gap-2 shadow-lg">
       <Icon className={cn("w-5 h-5", color)} />
       <span className="text-xl font-black text-white italic tabular-nums">{value}</span>
       <span className="text-[8px] font-black uppercase text-white/20 tracking-widest">{label}</span>
    </div>
  )
}

function ActionButton({ icon: Icon, label }: any) {
  return (
    <button className="w-full p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-between hover:bg-white/5 transition-all group active:scale-98">
       <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-all">
             <Icon className="w-5 h-5 text-white/40 group-hover:text-primary transition-all" />
          </div>
          <span className="text-[11px] font-black text-white uppercase italic tracking-widest">{label}</span>
       </div>
       <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-primary transition-all" />
    </button>
  )
}
