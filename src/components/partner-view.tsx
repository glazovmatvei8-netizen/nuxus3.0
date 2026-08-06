
"use client"

import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Code2, Zap, Rocket, ShieldCheck, Cpu, Globe, ArrowRight, 
  MessageSquare, Bot, Sparkles, Terminal, Key, Webhook, 
  Layers, Copy, Check, Info, FileCode, Server, Cloud, LayoutGrid
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NuxusLogo } from './nuxus-logo';
import { useToast } from '@/hooks/use-toast';

/**
 * PARTNER HUB V2.5 «BOT INTERACTIVITY»
 * Добавлены спецификации клавиатур и интерактивных кнопок.
 */
export default function PartnerView() {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

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
      
      <header className="px-6 pt-12 pb-6 shrink-0 z-20 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-xl">
               <Code2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex flex-col text-left">
               <h1 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">Partner Hub</h1>
               <span className="text-[7px] font-black text-primary/40 uppercase tracking-[0.4em] mt-1">Nuxus Dev Engine v2.5</span>
            </div>
         </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-10 pb-40 animate-in fade-in duration-700">
          
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
               Облачная инфраструктура с поддержкой интерактивных ботов.
             </p>
          </div>

          {/* Infrastructure Guarantee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="p-5 bg-white/[0.03] border border-white/10 rounded-[1.8rem] flex flex-col gap-3 shadow-lg">
                <Server className="w-6 h-6 text-primary" />
                <h4 className="text-[10px] font-black uppercase text-white tracking-widest">24/7 Availability</h4>
                <p className="text-[8px] text-white/40 font-bold uppercase leading-relaxed">Наши шлюзы работают на Serverless технологии — бот всегда в сети.</p>
             </div>
             <div className="p-5 bg-white/[0.03] border border-white/10 rounded-[1.8rem] flex flex-col gap-3 shadow-lg">
                <Cloud className="w-6 h-6 text-accent" />
                <h4 className="text-[10px] font-black uppercase text-white tracking-widest">Global Edge</h4>
                <p className="text-[8px] text-white/40 font-bold uppercase leading-relaxed">Сигнал доставляется через ближайшие узлы Vercel и Firebase CDN.</p>
             </div>
          </div>

          {/* Bot Keyboards Showcase */}
          <div className="bg-primary/5 border border-primary/20 p-6 rounded-[2.5rem] space-y-4 shadow-xl">
             <div className="flex items-center gap-3">
                <LayoutGrid className="w-5 h-5 text-primary" />
                <h3 className="text-xs font-black uppercase text-white italic tracking-widest">Bot Keyboards</h3>
             </div>
             <p className="text-[9px] text-white/60 font-medium leading-relaxed uppercase">
                Поддержка интерактивных кнопок прямо в чате. Отправляйте JSON-структуру `keyboard` для взаимодействия с игроками.
             </p>
             <div className="bg-black/60 p-4 rounded-2xl font-mono text-[8px] text-primary/80 overflow-x-auto">
                <pre>{`"keyboard": {
  "rows": [
    [{ "text": "⚔️ Атака", "color": "destructive" }],
    [{ "text": "🎒 Инвентарь" }, { "text": "✨ Магия" }]
  ]
}`}</pre>
             </div>
          </div>

          {/* API Token Section */}
          <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative overflow-hidden group">
             <div className="flex items-center gap-4 mb-2">
                <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
                   <Key className="w-5 h-5" />
                </div>
                <div className="flex flex-col text-left">
                   <h3 className="text-sm font-black text-white uppercase italic tracking-widest">Authentication</h3>
                   <span className="text-[8px] text-white/30 uppercase font-black">Управление доступом бота</span>
                </div>
             </div>
             
             {token ? (
               <div className="space-y-4 animate-in zoom-in-95 duration-300">
                  <div className="bg-black/60 p-4 rounded-2xl border border-primary/40 flex items-center justify-between gap-4">
                     <code className="text-primary text-[10px] font-mono truncate flex-1">{token}</code>
                     <button onClick={() => copyToClipboard(token)} className="text-white/40 hover:text-primary transition-colors"><Copy className="w-4 h-4" /></button>
                  </div>
                  <p className="text-[8px] text-red-500 font-bold uppercase tracking-widest text-center">Никому не передавайте этот ключ!</p>
               </div>
             ) : (
               <Button 
                onClick={generateToken} 
                disabled={isGenerating}
                className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all"
               >
                  {isGenerating ? <Sparkles className="w-5 h-5 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />} 
                  {isGenerating ? 'Инициализация...' : 'Generate Bot Token'}
               </Button>
             )}
          </div>

          {/* Technical Docs Section */}
          <div className="space-y-6">
             <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 flex items-center gap-2 px-1">
                <FileCode className="w-3 h-3" /> Technical Specs
             </h3>
             
             <div className="space-y-4">
                <DocItem 
                  title="Webhooks" 
                  desc="Nuxus отправляет POST запрос на ваш сервер при каждом новом сообщении или нажатии кнопки."
                  icon={Webhook}
                />
                <DocItem 
                  title="Methods" 
                  desc="sendMessage, deleteMessage, getChatMembers. Всё через защищенные HTTPS эндпоинты."
                  icon={Layers}
                />
             </div>
          </div>

          {/* Project Spirit Shoutout */}
          <div className="bg-primary/10 border border-primary/20 p-8 rounded-[2.5rem] space-y-6 shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
                <Sparkles className="w-32 h-32 text-primary" />
             </div>
             <div className="space-y-2 relative z-10 text-left">
                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter leading-tight">Special Offer: <br/>Spirit of the Elements</h3>
                <p className="text-[10px] text-primary/60 font-black uppercase tracking-widest leading-relaxed">
                   Ваш проект заслуживает элитного хостинга. Мы гарантируем 24/7 работу игровых серверов через наш API шлюз.
                </p>
             </div>
             <div className="bg-black/40 p-5 rounded-2xl border border-white/5 space-y-3 relative z-10">
                <div className="flex items-center gap-3">
                   <div className="w-1 h-1 rounded-full bg-green-500 animate-ping" />
                   <span className="text-[9px] font-black text-white uppercase tracking-widest">Ready for integration</span>
                </div>
                <p className="text-[10px] text-white/40 font-medium italic">Endpoint: https://nuxus.fun/api/bot</p>
             </div>
             <Button className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all group-hover:scale-[1.02]">
                Contact Core Team <ArrowRight className="ml-2 w-4 h-4" />
             </Button>
          </div>

          <div className="flex flex-col items-center gap-6 opacity-30 pt-10">
             <div className="flex items-center gap-6">
                <Globe className="w-4 h-4" />
                <Zap className="w-4 h-4" />
                <Rocket className="w-4 h-4" />
             </div>
             <span className="text-[7px] font-black uppercase tracking-[0.8em]">Nuxus Kernel Infrastructure v2.5</span>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}

function DocItem({ icon: Icon, title, desc }: any) {
  return (
    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex gap-5 hover:bg-white/[0.04] transition-all">
       <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary shrink-0">
          <Icon className="w-5 h-5" />
       </div>
       <div className="flex flex-col gap-1 text-left">
          <span className="text-[12px] font-black text-white uppercase italic tracking-widest">{title}</span>
          <span className="text-[9px] text-white/40 font-bold uppercase leading-relaxed">{desc}</span>
       </div>
    </div>
  )
}
