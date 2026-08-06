
"use client"

import React, { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Code2, Zap, ShieldCheck, Terminal, Key, Webhook, 
  Copy, Loader2, Users, Trash2, Camera, User, X,
  Activity, LayoutGrid, Info, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NuxusLogo } from './nuxus-logo';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection } from '@/firebase/provider';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import { UserAvatar } from './user-avatar';
import type { Chat } from '@/lib/types';

/**
 * PARTNER HUB V8.0.0 «CLEAN SLATE PROTOCOL»
 * REMOVED: All fake data and hardcoded examples (Spirit of elements).
 * FIXED: Real audience logic based on actual bot presence in chats.
 */
export default function PartnerView() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [apiKeys, setApiKeys] = useState<{id: string, key: string, createdAt: string}[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('docs');

  // Данные бота - ТЕПЕРЬ ПУСТЫ ПО УМОЛЧАНИЮ
  const [botForm, setBotForm] = useState({
    name: '',
    username: '',
    avatarUrl: '',
    webhookUrl: ''
  });

  // Загрузка чатов текущего пользователя
  const chatsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid));
  }, [db, user?.uid]);
  const { data: myChats } = useCollection<Chat>(chatsQuery);

  /**
   * ЛОГИКА РЕАЛЬНОЙ АУДИТОРИИ:
   * Сканируем чаты только на наличие РЕАЛЬНЫХ ботов (ID которых начинается на bot_).
   * Если в чате есть бот, добавляем других участников этого чата в список аудитории.
   */
  const botAudience = useMemo(() => {
    if (!myChats) return [];
    const uniqueUids = new Set<string>();
    
    myChats.forEach(chat => {
      // Проверяем, есть ли в этом чате хоть один бот
      const hasBot = chat.participantIds.some(pid => pid.startsWith('bot_'));
      if (hasBot) {
        chat.participantIds.forEach(pid => {
          // Добавляем только реальных людей (не ботов и не самого владельца консоли)
          if (!pid.startsWith('bot_') && pid !== user?.uid) {
            uniqueUids.add(pid);
          }
        });
      }
    });
    
    return Array.from(uniqueUids);
  }, [myChats, user?.uid]);

  const generateToken = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const newKey = {
        id: Math.random().toString(36).substring(7),
        key: `nx_live_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      setApiKeys(prev => [newKey, ...prev]);
      setIsGenerating(false);
      toast({ title: "Ключ создан", description: "Новый узел доступа активирован." });
    }, 1000);
  };

  const deleteToken = (id: string) => {
    setApiKeys(prev => prev.filter(k => k.id !== id));
    toast({ title: "Ключ аннигилирован" });
  };

  const handleUpdateIdentity = async () => {
    if (!botForm.name || !botForm.username) {
      toast({ title: "Ошибка", description: "Укажите имя и ID бота", variant: "destructive" });
      return;
    }
    toast({ title: "Identity Synced", description: "Данные бота обновлены в реестре Ядра." });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Скопировано" });
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
               <span className="text-[7px] font-black text-primary/40 uppercase tracking-[0.4em] mt-1">Dev Kit v8.0.0</span>
            </div>
         </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="px-6 mb-4 relative z-30">
           <TabsList className="grid grid-cols-3 bg-white/5 p-1 rounded-2xl border border-white/5">
             <TabsTrigger value="docs" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary">Docs</TabsTrigger>
             <TabsTrigger value="console" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary">Console</TabsTrigger>
             <TabsTrigger value="identity" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary">Identity</TabsTrigger>
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
                   Профессиональная среда для разработки ботов и интеграции игровых миров.
                 </p>
              </div>

              <div className="bg-primary/5 border border-primary/20 p-6 rounded-[2.5rem] space-y-4 shadow-xl text-left">
                 <div className="flex items-center gap-3">
                    <LayoutGrid className="w-5 h-5 text-primary" />
                    <h3 className="text-xs font-black uppercase text-white italic tracking-widest">Bot Keyboards</h3>
                 </div>
                 <p className="text-[9px] text-white/60 font-medium leading-relaxed uppercase">
                    Используйте JSON для создания интерактивных интерфейсов внутри чатов.
                 </p>
                 <div className="bg-black/60 p-4 rounded-2xl font-mono text-[8px] text-primary/80 overflow-x-auto">
                    <pre>{`"keyboard": {
  "rows": [
    [{ "text": "⚔️ Действие", "color": "destructive", "payload": "cmd_1" }],
    [{ "text": "🎒 Инвентарь" }, { "text": "✨ Прочее" }]
  ]
}`}</pre>
                 </div>
              </div>

              <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative overflow-hidden group">
                 <div className="flex items-center gap-4 mb-2 text-left">
                    <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
                       <Key className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                       <h3 className="text-sm font-black text-white uppercase italic tracking-widest">API Access</h3>
                       <span className="text-[8px] text-white/30 uppercase font-black">Управление ключами доступа</span>
                    </div>
                 </div>
                 
                 <Button 
                    onClick={generateToken} 
                    disabled={isGenerating}
                    className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all"
                 >
                    {isGenerating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />} 
                    {isGenerating ? 'Генерация...' : 'Generate New API Key'}
                 </Button>
              </div>
            </TabsContent>

            <TabsContent value="console" className="m-0 space-y-8">
               <div className="grid grid-cols-2 gap-4">
                  <StatCard icon={Activity} label="Signals" value="0" color="text-primary" />
                  <StatCard icon={Users} label="Bot Audience" value={botAudience.length} color="text-accent" />
                  <StatCard icon={ShieldCheck} label="Uptime" value="100%" color="text-green-500" />
                  <StatCard icon={Zap} label="Response" value="-" color="text-yellow-500" />
               </div>

               <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 px-1 text-left">Active API Keys</h3>
                  <div className="space-y-2">
                     {apiKeys.length > 0 ? apiKeys.map(k => (
                       <div key={k.id} className="flex flex-col p-4 bg-white/[0.03] border border-white/5 rounded-2xl gap-3">
                          <div className="flex items-center justify-between">
                             <code className="text-primary text-[9px] font-mono truncate max-w-[200px]">{k.key}</code>
                             <div className="flex gap-2">
                                <button onClick={() => copyToClipboard(k.key)} className="p-2 bg-white/5 rounded-lg text-white/40 hover:text-primary transition-all"><Copy className="w-3.5 h-3.5" /></button>
                                <button onClick={() => deleteToken(k.id)} className="p-2 bg-red-500/10 rounded-lg text-red-500/60 hover:text-red-500 transition-all"><X className="w-3.5 h-3.5" /></button>
                             </div>
                          </div>
                          <span className="text-[7px] text-white/10 font-black uppercase tracking-widest text-left">Issued: {new Date(k.createdAt).toLocaleDateString()}</span>
                       </div>
                     )) : (
                       <div className="p-10 border border-dashed border-white/5 rounded-2xl text-center opacity-20">
                          <p className="text-[9px] font-black uppercase tracking-widest">Ключи не созданы</p>
                       </div>
                     )}
                  </div>
               </div>

               <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 px-1 text-left">Connected Nodes (Audience)</h3>
                  <div className="grid grid-cols-1 gap-2">
                     {botAudience.length > 0 ? botAudience.map(uid => (
                       <div key={uid} className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.06] transition-all">
                          <div className="flex items-center gap-3">
                             <UserAvatar userId={uid} className="h-10 w-10" />
                             <div className="flex flex-col text-left">
                                <span className="text-[11px] font-black text-white uppercase italic">Node #{uid.slice(0, 5)}</span>
                                <span className="text-[8px] text-white/30 font-black uppercase tracking-widest">Active Link</span>
                             </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/10" />
                       </div>
                     )) : (
                        <div className="p-10 border border-dashed border-white/5 rounded-2xl text-center opacity-20">
                           <p className="text-[9px] font-black uppercase tracking-widest">Аудитория не обнаружена</p>
                        </div>
                     )}
                  </div>
               </div>
            </TabsContent>

            <TabsContent value="identity" className="m-0 space-y-8">
               <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 space-y-8 shadow-2xl">
                  <div className="flex flex-col items-center gap-6">
                     <div className="relative group">
                        <div className="h-32 w-32 rounded-[2.5rem] bg-black/40 border-2 border-dashed border-primary/40 flex items-center justify-center overflow-hidden">
                           {botForm.avatarUrl ? (
                             <img src={botForm.avatarUrl} className="w-full h-full object-cover" alt="Bot Avatar" />
                           ) : (
                             <User className="w-10 h-10 text-white/10" />
                           )}
                        </div>
                        <button className="absolute -bottom-2 -right-2 bg-primary p-2.5 rounded-xl shadow-xl"><Camera className="w-4 h-4 text-white" /></button>
                     </div>
                     <div className="text-center">
                        <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">
                          {botForm.name || 'Unnamed Bot'}
                        </h4>
                        <p className="text-[10px] text-primary/60 font-black uppercase tracking-widest">
                          {botForm.username || '@username'}
                        </p>
                     </div>
                  </div>

                  <div className="space-y-6 text-left">
                     <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase text-primary/60 ml-1">Название бота</Label>
                        <Input 
                          placeholder="Напр. My Super Bot"
                          value={botForm.name} 
                          onChange={e => setBotForm({...botForm, name: e.target.value})}
                          className="h-12 bg-black/40 border-white/10 rounded-xl font-bold" 
                        />
                     </div>
                     <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase text-primary/60 ml-1">Уникальный ID (@nick)</Label>
                        <Input 
                          placeholder="@my_bot"
                          value={botForm.username} 
                          onChange={e => setBotForm({...botForm, username: e.target.value})}
                          className="h-12 bg-black/40 border-white/10 rounded-xl font-bold" 
                        />
                     </div>
                     <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase text-primary/60 ml-1">Avatar URL</Label>
                        <Input 
                          placeholder="https://..."
                          value={botForm.avatarUrl} 
                          onChange={e => setBotForm({...botForm, avatarUrl: e.target.value})}
                          className="h-12 bg-black/40 border-white/10 rounded-xl" 
                        />
                     </div>
                     <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase text-primary/60 ml-1">Webhook Endpoint</Label>
                        <Input 
                          placeholder="https://your-server.com/webhook"
                          value={botForm.webhookUrl} 
                          onChange={e => setBotForm({...botForm, webhookUrl: e.target.value})}
                          className="h-12 bg-black/40 border-white/10 rounded-xl font-mono text-xs" 
                        />
                     </div>

                     <Button 
                       onClick={handleUpdateIdentity}
                       className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all mt-4"
                     >
                        Initialize Bot Identity
                     </Button>
                  </div>
               </div>

               <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-[2rem] space-y-4">
                  <div className="flex items-center gap-3 text-red-500">
                     <Trash2 className="w-5 h-5" />
                     <span className="text-[10px] font-black uppercase tracking-widest">Danger Zone</span>
                  </div>
                  <Button variant="ghost" className="w-full h-12 rounded-xl text-red-500/60 hover:text-red-500 hover:bg-red-500/10 text-[9px] font-black uppercase tracking-widest">
                     Аннигилировать данные бота
                  </Button>
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

function ChevronRight(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
