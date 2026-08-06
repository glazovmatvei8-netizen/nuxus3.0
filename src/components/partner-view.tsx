
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
  Activity, LayoutGrid, Info, ExternalLink, ChevronRight, Plus, Bot, BotOff, Sparkles, Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NuxusLogo } from './nuxus-logo';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase/provider';
import { collection, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';

interface BotInstance {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  webhookUrl: string;
  apiKeys: {id: string, key: string, createdAt: string}[];
  createdAt: string;
  status?: 'active' | 'offline';
}

/**
 * PARTNER HUB V8.3.0 «BOT GENESIS»
 * FIXED: Real Firestore synchronization for bot identity and AI logic.
 */
export default function PartnerView() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [bots, setBots] = useState<BotInstance[]>([]);
  const [activeBotId, setActiveBotId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('docs');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // LOAD BOTS FROM PERSISTENCE
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('nuxus_factory_bots');
    if (saved) {
      setBots(JSON.parse(saved));
    }
  }, []);

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
    const updatedBots = [...bots, newBot];
    setBots(updatedBots);
    localStorage.setItem('nuxus_factory_bots', JSON.stringify(updatedBots));
    setActiveBotId(newBot.id);
    setActiveTab('identity');
    toast({ title: "Слот активирован", description: "Настройте личность нового бота." });
  };

  const deleteBot = async (id: string) => {
    if (!db) return;
    if (confirm('Аннигилировать этого бота из Ядра?')) {
      await deleteDoc(doc(db, 'bots', id));
      const updatedBots = bots.filter(b => b.id !== id);
      setBots(updatedBots);
      localStorage.setItem('nuxus_factory_bots', JSON.stringify(updatedBots));
      setActiveBotId(null);
      setActiveTab('docs');
      toast({ title: "Бот аннигилирован" });
    }
  };

  const updateBotData = (data: Partial<BotInstance>) => {
    const updated = bots.map(b => b.id === activeBotId ? { ...b, ...data } : b);
    setBots(updated);
    localStorage.setItem('nuxus_factory_bots', JSON.stringify(updated));
  };

  const handleInitialize = async () => {
    if (!activeBot || !db || !user) return;
    if (!activeBot.name || !activeBot.username) {
      toast({ title: "Ошибка", description: "Укажите имя и @username бота", variant: "destructive" });
      return;
    }

    setIsSyncing(true);
    try {
      const formattedUsername = activeBot.username.startsWith('@') ? activeBot.username : '@' + activeBot.username;
      const botData = {
        ...activeBot,
        username: formattedUsername,
        usernameLowercase: formattedUsername.toLowerCase(),
        ownerId: user.uid,
        isBot: true,
        lastSeen: new Date().toISOString()
      };

      // REAL SYNC TO FIRESTORE
      await setDoc(doc(db, 'bots', activeBot.id), botData, { merge: true });
      
      // Also register as a system user for search stability
      await setDoc(doc(db, 'users', activeBot.id), {
        id: activeBot.id,
        name: activeBot.name,
        username: formattedUsername,
        usernameLowercase: formattedUsername.toLowerCase(),
        avatarUrl: activeBot.avatarUrl || null,
        isBot: true,
        createdAt: activeBot.createdAt
      }, { merge: true });

      toast({ title: "Сигнал синхронизирован", description: "Бот теперь виден в Глобальном Поиске." });
      setActiveTab('console');
    } catch (e: any) {
      toast({ title: "Ошибка синхронизации", description: e.message, variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
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
      
      <header className="px-6 pt-12 pb-4 shrink-0 z-30 flex items-center justify-between bg-[#020205]/80 backdrop-blur-xl border-b border-white/5">
         <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
               <Terminal className="w-5 h-5 text-primary" />
            </div>
            <div className="flex flex-col text-left">
               <h1 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">Partner Hub</h1>
               <span className="text-[7px] font-black text-primary/40 uppercase tracking-[0.4em] mt-1">Bot Factory v8.3.0</span>
            </div>
         </div>
         {bots.length > 0 && (
           <Button onClick={createBot} disabled={bots.length >= 5} className="h-9 rounded-xl bg-primary text-white font-black uppercase text-[9px] tracking-widest gap-2 shadow-lg shadow-primary/20">
             <Plus className="w-3.5 h-3.5" /> Создать
           </Button>
         )}
      </header>

      {/* Bot Selector Rail */}
      {bots.length > 0 && (
        <div className="px-6 py-3 shrink-0 z-30 flex gap-3 overflow-x-auto scrollbar-hide bg-[#020205]/40 border-b border-white/5">
           {bots.map(bot => (
             <button 
               key={bot.id} 
               onClick={() => { setActiveBotId(bot.id); setActiveTab('console'); }}
               className={cn(
                 "h-14 min-w-[56px] rounded-2xl border transition-all flex items-center justify-center relative overflow-hidden group shadow-xl",
                 activeBotId === bot.id ? "border-primary bg-primary/20 scale-105" : "border-white/10 bg-white/5 opacity-60 hover:opacity-100"
               )}
             >
                {bot.avatarUrl ? (
                  <img src={bot.avatarUrl} className="w-full h-full object-cover" alt="Bot" />
                ) : (
                  <Bot className={cn("w-6 h-6", activeBotId === bot.id ? "text-primary" : "text-white/20")} />
                )}
                {activeBotId === bot.id && <div className="absolute inset-0 bg-primary/5 animate-pulse" />}
             </button>
           ))}
           {bots.length < 5 && (
             <button onClick={createBot} className="h-14 min-w-[56px] rounded-2xl border border-dashed border-white/10 flex items-center justify-center text-white/20 hover:text-primary hover:border-primary/40 transition-all">
                <Plus className="w-6 h-6" />
             </button>
           )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        {activeBotId && (
          <div className="px-6 mt-4 relative z-30">
             <TabsList className="grid grid-cols-3 bg-white/5 p-1 rounded-2xl border border-white/5">
               <TabsTrigger value="docs" className="text-[9px] font-black uppercase tracking-widest">Docs</TabsTrigger>
               <TabsTrigger value="console" className="text-[9px] font-black uppercase tracking-widest">Console</TabsTrigger>
               <TabsTrigger value="identity" className="text-[9px] font-black uppercase tracking-widest">Identity</TabsTrigger>
             </TabsList>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="p-6 pb-40 animate-in fade-in duration-700">
            
            {(bots.length === 0 || activeTab === 'docs') && (
              <div className="text-center space-y-10 py-10">
                 <div className="flex justify-center mb-6">
                    <div className="relative">
                       <div className="absolute -inset-10 bg-primary/20 blur-[60px] rounded-full animate-pulse" />
                       <NuxusLogo size={160} />
                    </div>
                 </div>
                 <div className="space-y-4">
                    <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-tight">
                      Build on <span className="text-primary">NUXUS</span>
                    </h2>
                    <p className="text-[11px] text-white/40 font-bold uppercase tracking-[0.3em] max-w-xs mx-auto leading-relaxed">
                      Создавайте живых ботов. Используйте встроенный интеллект Ядра для мгновенной логики.
                    </p>
                 </div>

                 {bots.length === 0 && (
                   <Button 
                    onClick={createBot}
                    className="w-full max-w-sm h-20 bg-primary text-white rounded-[2.2rem] font-black uppercase italic tracking-[0.2em] text-lg shadow-[0_20px_50px_rgba(168,85,247,0.3)] active:scale-95 transition-all group overflow-hidden border border-white/10"
                   >
                      <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                      <Plus className="w-6 h-6 mr-3" /> СОЗДАТЬ ПЕРВОГО БОТА
                   </Button>
                 )}

                 <div className="grid grid-cols-1 gap-4 text-left">
                   <FeatureCard icon={Sparkles} title="Neural Engine" desc="Боты работают на NX-AI по умолчанию. Сервер не обязателен." />
                   <FeatureCard icon={Zap} title="Direct Sync" desc="После инициализации бот мгновенно появляется в поиске." />
                   <FeatureCard icon={ShieldCheck} title="QES Auth" desc="Безопасная идентификация через элитные API токены." />
                 </div>
              </div>
            )}

            {activeBot && activeTab !== 'docs' && (
              <>
                <TabsContent value="console" className="m-0 space-y-8">
                   <div className="grid grid-cols-2 gap-4">
                      <StatCard icon={Activity} label="Status" value="ONLINE" color="text-green-500" />
                      <StatCard icon={Users} label="Audience" value="0" color="text-primary" />
                   </div>

                   <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6 space-y-4">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                            <BrainCircuit className="w-4 h-4 text-primary" />
                         </div>
                         <span className="text-[10px] font-black uppercase text-white tracking-widest">Neural Link: ACTIVE</span>
                      </div>
                      <p className="text-[9px] text-white/40 uppercase font-bold leading-relaxed">
                        Этот узел подключен к разуму Ядра. NX-AI будет отвечать пользователям от имени бота, имитируя логику игры.
                      </p>
                   </div>

                   <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 px-1 text-left">Управление ключами</h3>
                      <Button 
                        onClick={generateToken} 
                        disabled={isGenerating}
                        className="w-full h-12 bg-white/5 border border-white/10 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-primary/10 transition-all"
                      >
                         {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />} 
                         Генерировать токен
                      </Button>
                      
                      <div className="space-y-2">
                        {activeBot.apiKeys.map(k => (
                          <div key={k.id} className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl shadow-inner">
                             <code className="text-primary text-[9px] font-mono truncate max-w-[200px]">{k.key}</code>
                             <div className="flex gap-2">
                                <button onClick={() => { navigator.clipboard.writeText(k.key); toast({title: "Скопировано"}); }} className="p-2 text-white/20 hover:text-white"><Copy className="w-4 h-4" /></button>
                                <button onClick={() => updateBotData({ apiKeys: activeBot.apiKeys.filter(x => x.id !== k.id) })} className="p-2 text-red-500/40 hover:text-red-500"><X className="w-4 h-4" /></button>
                             </div>
                          </div>
                        ))}
                      </div>
                   </div>
                </TabsContent>

                <TabsContent value="identity" className="m-0 space-y-6">
                   <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 space-y-8 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
                         <Bot className="w-40 h-40" />
                      </div>
                      
                      <div className="space-y-6 text-left relative z-10">
                        <div className="space-y-2">
                           <Label className="text-[9px] font-black uppercase text-primary/60 ml-1 tracking-widest">Публичное имя бота</Label>
                           <Input 
                             value={activeBot.name} 
                             onChange={e => updateBotData({ name: e.target.value })}
                             placeholder="Название (например: Дух Стихий)" 
                             className="h-14 bg-black/40 border-white/10 rounded-2xl font-black italic text-lg" 
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[9px] font-black uppercase text-primary/60 ml-1 tracking-widest">Уникальный @ID</Label>
                           <div className="relative">
                             <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black">@</span>
                             <Input 
                               value={activeBot.username.replace('@', '')} 
                               onChange={e => updateBotData({ username: e.target.value })}
                               placeholder="spirit_bot" 
                               className="h-14 bg-black/40 border-white/10 rounded-2xl pl-9 font-bold text-sm tracking-widest" 
                             />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[9px] font-black uppercase text-primary/60 ml-1 tracking-widest">Аватар (URL)</Label>
                           <Input 
                             value={activeBot.avatarUrl} 
                             onChange={e => updateBotData({ avatarUrl: e.target.value })}
                             placeholder="https://i.ibb.co/..." 
                             className="h-12 bg-black/40 border-white/10 rounded-xl" 
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[9px] font-black uppercase text-primary/60 ml-1 tracking-widest">Webhook URL (Опционально)</Label>
                           <Input 
                             value={activeBot.webhookUrl} 
                             onChange={e => updateBotData({ webhookUrl: e.target.value })}
                             placeholder="https://your-server.com/api" 
                             className="h-12 bg-black/40 border-white/10 rounded-xl font-mono text-xs opacity-60" 
                           />
                        </div>
                      </div>

                      <div className="pt-6 space-y-4">
                         <Button 
                           onClick={handleInitialize}
                           disabled={isSyncing}
                           className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase italic tracking-[0.2em] shadow-2xl active:scale-95 group relative overflow-hidden"
                         >
                            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                            {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> Инициализировать в Ядре</>}
                         </Button>
                         <Button 
                           variant="ghost" 
                           onClick={() => deleteBot(activeBot.id)}
                           className="w-full h-12 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl text-[9px] font-black uppercase tracking-widest"
                         >
                            Аннигилировать узел
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

function BrainCircuit(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-brain-circuit"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .52 6.588A3 3 0 1 0 12 18Z"/><path d="M9 13a4.5 4.5 0 0 0 3-4"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.306"/><path d="M4.001 17.483a3 3 0 0 1 .503-.995"/><path d="M16 8h1a2 2 0 0 1 2 2v2"/><path d="M14 12h1"/><path d="M20 14h1a2 2 0 0 1 2 2v2"/><path d="M18 18h1"/><path d="M15 15a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"/></svg>
  )
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
    <div className="flex items-center gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-2xl text-left hover:bg-white/[0.04] transition-all">
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
