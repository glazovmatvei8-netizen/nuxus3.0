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
  Activity, LayoutGrid, Info, ExternalLink, ChevronRight, Plus, Bot, BotOff, Sparkles, Save, Wrench
} from 'lucide-react';
import { cn, isGlobalAdmin } from '@/lib/utils';
import { NuxusLogo } from './nuxus-logo';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc } from '@/firebase/provider';
import { collection, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import type { User as UserType } from '@/lib/types';

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
 * PARTNER HUB V8.5.0 «MAINTENANCE MODE»
 * Доступ только для Администраторов.
 */
export default function PartnerView() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const userProfileRef = useMemo(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile } = useDoc<UserType>(userProfileRef);
  const isAdmin = isGlobalAdmin(profile);

  const [bots, setBots] = useState<BotInstance[]>([]);
  const [activeBotId, setActiveBotId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('docs');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !isAdmin) return;
    const saved = localStorage.getItem('nuxus_factory_bots');
    if (saved) {
      setBots(JSON.parse(saved));
    }
  }, [isAdmin]);

  const activeBot = useMemo(() => bots.find(b => b.id === activeBotId), [bots, activeBotId]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#020205] p-10 text-center space-y-8 animate-in fade-in duration-700">
        <div className="relative">
          <div className="absolute -inset-10 bg-primary/20 blur-[60px] rounded-full animate-pulse" />
          <Wrench className="w-20 h-20 text-primary relative z-10" />
        </div>
        <div className="space-y-4 max-w-sm">
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">PARTNER HUB MAINTENANCE</h2>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.3em] leading-relaxed">
            Раздел разработки ботов временно недоступен. <br/>Инженеры Ядра проводят оптимизацию протоколов API.
          </p>
        </div>
      </div>
    );
  }

  const createBot = () => {
    if (bots.length >= 5) {
      toast({ title: "Limit Reached", variant: "destructive" });
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
  };

  const deleteBot = async (id: string) => {
    if (!db) return;
    if (confirm('Аннигилировать этого бота?')) {
      await deleteDoc(doc(db, 'bots', id));
      const updatedBots = bots.filter(b => b.id !== id);
      setBots(updatedBots);
      localStorage.setItem('nuxus_factory_bots', JSON.stringify(updatedBots));
      setActiveBotId(null);
      setActiveTab('docs');
    }
  };

  const updateBotData = (data: Partial<BotInstance>) => {
    const updated = bots.map(b => b.id === activeBotId ? { ...b, ...data } : b);
    setBots(updated);
    localStorage.setItem('nuxus_factory_bots', JSON.stringify(updated));
  };

  const handleInitialize = async () => {
    if (!activeBot || !db || !user) return;
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
      await setDoc(doc(db, 'bots', activeBot.id), botData, { merge: true });
      await setDoc(doc(db, 'users', activeBot.id), {
        id: activeBot.id,
        name: activeBot.name,
        username: formattedUsername,
        usernameLowercase: formattedUsername.toLowerCase(),
        avatarUrl: activeBot.avatarUrl || null,
        isBot: true,
        createdAt: activeBot.createdAt
      }, { merge: true });
      toast({ title: "Бот синхронизирован" });
      setActiveTab('console');
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
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
               <span className="text-[7px] font-black text-primary/40 uppercase tracking-[0.4em] mt-1">ADMIN CONSOLE ACTIVE</span>
            </div>
         </div>
      </header>

      {bots.length > 0 && (
        <div className="px-6 py-3 shrink-0 z-30 flex gap-3 overflow-x-auto scrollbar-hide bg-[#020205]/40 border-b border-white/5">
           {bots.map(bot => (
             <button 
               key={bot.id} 
               onClick={() => { setActiveBotId(bot.id); setActiveTab('console'); }}
               className={cn(
                 "h-14 min-w-[56px] rounded-2xl border transition-all flex items-center justify-center relative overflow-hidden group shadow-xl",
                 activeBotId === bot.id ? "border-primary bg-primary/20" : "border-white/10 bg-white/5 opacity-60"
               )}
             >
                {bot.avatarUrl ? <img src={bot.avatarUrl} className="w-full h-full object-cover" alt="Bot" /> : <Bot className="w-6 h-6 text-white/20" />}
             </button>
           ))}
           <button onClick={createBot} className="h-14 min-w-[56px] rounded-2xl border border-dashed border-white/10 flex items-center justify-center text-white/20 hover:text-primary transition-all">
              <Plus className="w-6 h-6" />
           </button>
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
          <div className="p-6 pb-40">
            {!activeBotId ? (
              <div className="text-center py-20">
                <NuxusLogo size={140} className="mx-auto mb-10" />
                <Button onClick={createBot} className="bg-primary text-white h-16 px-10 rounded-2xl font-black uppercase italic shadow-xl">Создать бота</Button>
              </div>
            ) : (
              <>
                <TabsContent value="console" className="m-0 space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 p-5 rounded-2xl border border-white/5 text-center">
                         <span className="text-xl font-black text-green-500">ACTIVE</span>
                         <p className="text-[8px] font-black uppercase text-white/20">Status</p>
                      </div>
                      <div className="bg-white/5 p-5 rounded-2xl border border-white/5 text-center">
                         <span className="text-xl font-black text-primary">0</span>
                         <p className="text-[8px] font-black uppercase text-white/20">Nodes</p>
                      </div>
                   </div>
                   <Button onClick={generateToken} disabled={isGenerating} className="w-full bg-primary/20 text-primary border border-primary/20 h-12 rounded-xl uppercase font-black text-[10px]">Генерировать API Ключ</Button>
                   <div className="space-y-2">
                     {activeBot.apiKeys.map(k => (
                       <div key={k.id} className="p-4 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
                         <code className="text-[9px] text-primary truncate max-w-[200px]">{k.key}</code>
                         <button onClick={() => updateBotData({ apiKeys: activeBot.apiKeys.filter(x => x.id !== k.id) })}><X className="w-4 h-4 text-red-500" /></button>
                       </div>
                     ))}
                   </div>
                </TabsContent>

                <TabsContent value="identity" className="m-0 space-y-6">
                   <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase text-primary/60">Название</Label>
                        <Input value={activeBot.name} onChange={e => updateBotData({ name: e.target.value })} className="h-12 bg-black/40 border-white/10" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase text-primary/60">@ID</Label>
                        <Input value={activeBot.username} onChange={e => updateBotData({ username: e.target.value })} className="h-12 bg-black/40 border-white/10" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase text-primary/60">Avatar URL</Label>
                        <Input value={activeBot.avatarUrl} onChange={e => updateBotData({ avatarUrl: e.target.value })} className="h-12 bg-black/40 border-white/10" />
                      </div>
                      <Button onClick={handleInitialize} disabled={isSyncing} className="w-full h-14 bg-primary text-white font-black uppercase rounded-2xl shadow-xl">
                        {isSyncing ? <Loader2 className="animate-spin" /> : 'Записать в Ядро'}
                      </Button>
                      <Button variant="ghost" onClick={() => deleteBot(activeBot.id)} className="w-full text-red-500/40 text-[9px] uppercase font-black">Удалить бота</Button>
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
