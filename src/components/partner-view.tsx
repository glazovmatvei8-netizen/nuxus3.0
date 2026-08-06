
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Code2, Zap, ShieldCheck, Terminal, Key, Webhook, 
  Copy, Loader2, Users, Trash2, Camera, User, X,
  Activity, LayoutGrid, Info, ExternalLink, ChevronRight, Plus, Bot, BotOff, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NuxusLogo } from './nuxus-logo';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection } from '@/firebase/provider';
import { collection, query, where, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { UserAvatar } from './user-avatar';
import type { Chat } from '@/lib/types';

interface BotInstance {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  webhookUrl: string;
  apiKeys: {id: string, key: string, createdAt: string}[];
  createdAt: string;
}

/**
 * PARTNER HUB V8.2.0 «BOT FACTORY»
 * Allows managing up to 5 bots with independent identities and consoles.
 */
export default function PartnerView() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [bots, setBots] = useState<BotInstance[]>([]);
  const [activeBotId, setActiveBotId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('docs');
  const [isGenerating, setIsGenerating] = useState(false);

  // LOAD BOTS FROM PERSISTENCE
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('nuxus_factory_bots');
    if (saved) {
      const parsed = JSON.parse(saved);
      setBots(parsed);
    }
  }, []);

  // SAVE BOTS TO PERSISTENCE & FIRESTORE (Simulated Sync)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('nuxus_factory_bots', JSON.stringify(bots));
    
    // In a real app, we would sync each bot to a 'bots' collection in Firestore
    // to make them searchable by others.
    if (db && user) {
      bots.forEach(bot => {
        const botRef = doc(db, 'bots', bot.id);
        setDoc(botRef, { 
          ...bot, 
          ownerId: user.uid, 
          isBot: true,
          usernameLowercase: bot.username.toLowerCase()
        }, { merge: true });
      });
    }
  }, [bots, db, user]);

  const activeBot = useMemo(() => bots.find(b => b.id === activeBotId), [bots, activeBotId]);

  const createBot = () => {
    if (bots.length >= 5) {
      toast({ title: "Limit Reached", description: "Максимум 5 ботов на один узел.", variant: "destructive" });
      return;
    }
    const newBot: BotInstance = {
      id: `bot_${Math.random().toString(36).substring(2, 11)}`,
      name: '',
      username: '',
      avatarUrl: '',
      webhookUrl: '',
      apiKeys: [],
      createdAt: new Date().toISOString()
    };
    setBots([...bots, newBot]);
    setActiveBotId(newBot.id);
    setActiveTab('identity');
    toast({ title: "Слот активирован", description: "Настройте личность нового бота." });
  };

  const deleteBot = (id: string) => {
    if (confirm('Аннигилировать этого бота и все его ключи?')) {
      setBots(bots.filter(b => b.id !== id));
      setActiveBotId(null);
      setActiveTab('docs');
      toast({ title: "Бот удален" });
    }
  };

  const updateBotData = (data: Partial<BotInstance>) => {
    setBots(bots.map(b => b.id === activeBotId ? { ...b, ...data } : b));
  };

  const generateToken = () => {
    if (!activeBot) return;
    setIsGenerating(true);
    setTimeout(() => {
      const newKey = {
        id: Math.random().toString(36).substring(7),
        key: `nx_live_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      updateBotData({ apiKeys: [newKey, ...activeBot.apiKeys] });
      setIsGenerating(false);
      toast({ title: "Ключ создан" });
    }, 600);
  };

  return (
    <div className="flex flex-col h-full bg-[#020205] overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1)_0%,transparent_60%)] pointer-events-none" />
      
      <header className="px-6 pt-12 pb-4 shrink-0 z-30 flex items-center justify-between bg-[#020205]/80 backdrop-blur-xl">
         <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
               <Terminal className="w-5 h-5 text-primary" />
            </div>
            <div className="flex flex-col text-left">
               <h1 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">Partner Hub</h1>
               <span className="text-[7px] font-black text-primary/40 uppercase tracking-[0.4em] mt-1">Bot Factory v8.2.0</span>
            </div>
         </div>
         <Button onClick={createBot} disabled={bots.length >= 5} className="h-9 rounded-xl bg-primary text-white font-black uppercase text-[9px] tracking-widest gap-2 shadow-lg shadow-primary/20">
           <Plus className="w-3.5 h-3.5" /> Создать
         </Button>
      </header>

      {/* Bot Selector Rail */}
      <div className="px-6 py-2 shrink-0 z-30 flex gap-2 overflow-x-auto scrollbar-hide border-b border-white/5 bg-[#020205]/40">
         {bots.map(bot => (
           <button 
             key={bot.id} 
             onClick={() => { setActiveBotId(bot.id); setActiveTab('console'); }}
             className={cn(
               "h-12 min-w-[48px] rounded-xl border transition-all flex items-center justify-center relative overflow-hidden group",
               activeBotId === bot.id ? "border-primary bg-primary/10 shadow-lg" : "border-white/10 bg-white/5"
             )}
           >
              {bot.avatarUrl ? (
                <img src={bot.avatarUrl} className="w-full h-full object-cover" alt="Bot" />
              ) : (
                <Bot className={cn("w-5 h-5", activeBotId === bot.id ? "text-primary" : "text-white/20")} />
              )}
              {activeBotId === bot.id && <div className="absolute inset-0 bg-primary/5 animate-pulse" />}
           </button>
         ))}
         {bots.length === 0 && (
           <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-dashed border-white/10 opacity-40">
              <BotOff className="w-4 h-4" />
              <span className="text-[9px] font-black uppercase tracking-widest">Нет активных ботов</span>
           </div>
         )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 mt-4">
        <div className="px-6 mb-4 relative z-30">
           <TabsList className="grid grid-cols-3 bg-white/5 p-1 rounded-2xl border border-white/5">
             <TabsTrigger value="docs" className="text-[9px] font-black uppercase tracking-widest">Docs</TabsTrigger>
             <TabsTrigger value="console" disabled={!activeBotId} className="text-[9px] font-black uppercase tracking-widest">Console</TabsTrigger>
             <TabsTrigger value="identity" disabled={!activeBotId} className="text-[9px] font-black uppercase tracking-widest">Identity</TabsTrigger>
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
                   Создавайте ботов, которые будут работать 24/7. Используйте наш Neural Engine для мгновенных ответов или подключите свой Webhook.
                 </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <FeatureCard icon={Sparkles} title="Neural Loop" desc="Ваш бот может использовать ИИ Ядра для ответов пользователям." />
                <FeatureCard icon={Zap} title="Direct Integration" desc="Созданные боты мгновенно появляются в поиске Ядра." />
                <FeatureCard icon={ShieldCheck} title="QES Auth" desc="Безопасная идентификация через API токены." />
              </div>
            </TabsContent>

            {activeBot && (
              <>
                <TabsContent value="console" className="m-0 space-y-8">
                   <div className="grid grid-cols-2 gap-4">
                      <StatCard icon={Activity} label="Status" value="ONLINE" color="text-green-500" />
                      <StatCard icon={Users} label="Audience" value="0" color="text-primary" />
                   </div>

                   <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 px-1 text-left">API Keys Management</h3>
                      <Button 
                        onClick={generateToken} 
                        disabled={isGenerating}
                        className="w-full h-12 bg-white/5 border border-white/10 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-primary/10 transition-all"
                      >
                         {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />} 
                         Создать новый ключ
                      </Button>
                      
                      <div className="space-y-2">
                        {activeBot.apiKeys.map(k => (
                          <div key={k.id} className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl">
                             <code className="text-primary text-[9px] font-mono truncate max-w-[200px]">{k.key}</code>
                             <div className="flex gap-2">
                                <button onClick={() => { navigator.clipboard.writeText(k.key); toast({title: "Скопировано"}); }} className="p-2 text-white/20 hover:text-white"><Copy className="w-4 h-4" /></button>
                                <button onClick={() => updateBotData({ apiKeys: activeBot.apiKeys.filter(x => x.id !== k.id) })} className="p-2 text-red-500/40 hover:text-red-500"><X className="w-4 h-4" /></button>
                             </div>
                          </div>
                        ))}
                      </div>
                   </div>

                   <div className="p-6 bg-primary/5 border border-primary/10 rounded-3xl space-y-4">
                      <div className="flex items-center gap-3">
                         <Info className="w-5 h-5 text-primary" />
                         <span className="text-[10px] font-black uppercase text-white tracking-widest">Neural Link Active</span>
                      </div>
                      <p className="text-[9px] text-white/40 uppercase font-bold leading-relaxed">
                        Этот бот подключен к нейронной сети Ядра. Он будет автоматически отвечать пользователям, если ваш внешний Webhook не настроен.
                      </p>
                   </div>
                </TabsContent>

                <TabsContent value="identity" className="m-0 space-y-6">
                   <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-2xl">
                      <div className="space-y-4 text-left">
                        <div className="space-y-1.5">
                           <Label className="text-[9px] font-black uppercase text-primary/60 ml-1">Публичное имя</Label>
                           <Input 
                             value={activeBot.name} 
                             onChange={e => updateBotData({ name: e.target.value })}
                             placeholder="Название бота" 
                             className="h-14 bg-black/40 border-white/10 rounded-2xl font-bold" 
                           />
                        </div>
                        <div className="space-y-1.5">
                           <Label className="text-[9px] font-black uppercase text-primary/60 ml-1">Уникальный ID (@ник)</Label>
                           <Input 
                             value={activeBot.username} 
                             onChange={e => updateBotData({ username: e.target.value })}
                             placeholder="@my_bot" 
                             className="h-14 bg-black/40 border-white/10 rounded-2xl font-bold" 
                           />
                        </div>
                        <div className="space-y-1.5">
                           <Label className="text-[9px] font-black uppercase text-primary/60 ml-1">Аватар (URL)</Label>
                           <Input 
                             value={activeBot.avatarUrl} 
                             onChange={e => updateBotData({ avatarUrl: e.target.value })}
                             placeholder="https://..." 
                             className="h-12 bg-black/40 border-white/10 rounded-xl" 
                           />
                        </div>
                        <div className="space-y-1.5">
                           <Label className="text-[9px] font-black uppercase text-primary/60 ml-1">Webhook URL (Опционально)</Label>
                           <Input 
                             value={activeBot.webhookUrl} 
                             onChange={e => updateBotData({ webhookUrl: e.target.value })}
                             placeholder="https://your-server.com/api" 
                             className="h-12 bg-black/40 border-white/10 rounded-xl font-mono text-xs" 
                           />
                        </div>
                      </div>

                      <div className="pt-4 space-y-4">
                         <Button 
                           onClick={() => toast({ title: "Данные синхронизированы" })}
                           className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl active:scale-95"
                         >
                            Initialize Identity
                         </Button>
                         <Button 
                           variant="ghost" 
                           onClick={() => deleteBot(activeBot.id)}
                           className="w-full h-12 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 rounded-xl text-[9px] font-black uppercase tracking-widest"
                         >
                            Удалить бота
                         </Button>
                      </div>
                   </div>
                </TabsContent>
              </>
            )}

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

function FeatureCard({ icon: Icon, title, desc }: any) {
  return (
    <div className="flex items-center gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-2xl text-left">
       <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
       </div>
       <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-black uppercase text-white tracking-widest">{title}</span>
          <span className="text-[9px] text-white/40 font-bold uppercase">{desc}</span>
       </div>
    </div>
  )
}
