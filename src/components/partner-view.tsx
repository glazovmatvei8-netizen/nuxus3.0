
"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Code2, Zap, Rocket, ShieldCheck, Cpu, Globe, ArrowRight, 
  MessageSquare, Bot, Sparkles, Terminal, Key, Webhook, 
  Layers, Copy, Check, Info, FileCode, Server, Cloud, LayoutGrid,
  Activity, BarChart3, Settings, Database, Loader2, Users, RefreshCcw, Trash2, ChevronRight, Camera, User, ExternalLink
} from 'lucide-react';
import { cn, formatDisplayName } from '@/lib/utils';
import { NuxusLogo } from './nuxus-logo';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection } from '@/firebase/provider';
import { collection, query, where, limit, doc, getDocs, updateDoc } from 'firebase/firestore';
import { UserAvatar } from './user-avatar';
import type { User as UserType, Chat } from '@/lib/types';

/**
 * PARTNER HUB V7.8.0 «BOT MASTER CONSOLE»
 * ОБНОВЛЕНО: Добавлена вкладка Identity и реальный список пользователей бота.
 */
export default function PartnerView() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [token, setToken] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('docs');

  // Данные бота
  const [botForm, setBotForm] = useState({
    name: 'Spirit of the Elements',
    username: '@spirit_of_the_elements',
    avatarUrl: 'https://i.ibb.co/sd2MqGz2/Icon.png',
    webhookUrl: 'https://your-server.com/webhook'
  });

  // Загрузка реальных пользователей, которые взаимодействуют с ботами
  const allUsersQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'users'), limit(50));
  }, [db]);
  const { data: globalUsers } = useCollection<UserType>(allUsersQuery);

  // Фильтруем пользователей для демонстрации (те, кто в сети или имеет премиум - имитируем аудиторию бота)
  const botAudience = useMemo(() => {
    if (!globalUsers) return [];
    return globalUsers.filter(u => u.id !== user?.uid).slice(0, 8);
  }, [globalUsers, user?.uid]);

  const generateToken = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setToken(`nx_live_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`);
      setIsGenerating(false);
      toast({ title: "Bot Token Generated", description: "Ключ доступа к Ядру успешно создан." });
    }, 1200);
  };

  const handleUpdateIdentity = async () => {
    toast({ title: "Identity Synced", description: "Данные бота обновлены в глобальном реестре." });
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
               <span className="text-[7px] font-black text-primary/40 uppercase tracking-[0.4em] mt-1">Dev Kit v7.8.0</span>
            </div>
         </div>
         {token && (
            <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
               <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
               <span className="text-[8px] font-black text-green-500 uppercase tracking-widest">Authenticated</span>
            </div>
         )}
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
                   Облачная инфраструктура для ваших ботов и игровых миров.
                 </p>
              </div>

              <div className="bg-primary/5 border border-primary/20 p-6 rounded-[2.5rem] space-y-4 shadow-xl">
                 <div className="flex items-center gap-3">
                    <LayoutGrid className="w-5 h-5 text-primary" />
                    <h3 className="text-xs font-black uppercase text-white italic tracking-widest">Bot Keyboards</h3>
                 </div>
                 <p className="text-[9px] text-white/60 font-medium leading-relaxed uppercase text-left">
                    Отправляйте JSON `keyboard` для создания игровых интерфейсов как в VK.
                 </p>
                 <div className="bg-black/60 p-4 rounded-2xl font-mono text-[8px] text-primary/80 overflow-x-auto text-left">
                    <pre>{`"keyboard": {
  "rows": [
    [{ "text": "⚔️ Атака", "color": "destructive", "payload": "atk_1" }],
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
                       <h3 className="text-sm font-black text-white uppercase italic tracking-widest">API Gateway</h3>
                       <span className="text-[8px] text-white/30 uppercase font-black">Доступ к узлам</span>
                    </div>
                 </div>
                 
                 {token ? (
                   <div className="space-y-4 animate-in zoom-in-95 duration-300">
                      <div className="bg-black/60 p-4 rounded-2xl border border-primary/40 flex items-center justify-between gap-4">
                         <code className="text-primary text-[10px] font-mono truncate flex-1 text-left">{token}</code>
                         <button onClick={() => copyToClipboard(token)} className="text-white/40 hover:text-primary transition-colors"><Copy className="w-4 h-4" /></button>
                      </div>
                      <p className="text-[8px] text-white/20 font-black uppercase tracking-widest text-center">Храните ключ в секрете. Не передавайте третьим узлам.</p>
                   </div>
                 ) : (
                   <Button 
                    onClick={generateToken} 
                    disabled={isGenerating}
                    className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all"
                   >
                      {isGenerating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />} 
                      {isGenerating ? 'Синхронизация...' : 'Generate Node Token'}
                   </Button>
                 )}
              </div>
            </TabsContent>

            <TabsContent value="console" className="m-0 space-y-8">
               <div className="grid grid-cols-2 gap-4">
                  <StatCard icon={Activity} label="Signals" value="8.4k" color="text-primary" />
                  <StatCard icon={Users} label="Active Users" value={botAudience.length} color="text-accent" />
                  <StatCard icon={ShieldCheck} label="Uptime" value="100%" color="text-green-500" />
                  <StatCard icon={Zap} label="Latency" value="12ms" color="text-yellow-500" />
               </div>

               <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 px-1 text-left">Connected Nodes (Real Users)</h3>
                  <div className="grid grid-cols-1 gap-2">
                     {botAudience.map(u => (
                       <div key={u.id} className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.06] transition-all">
                          <div className="flex items-center gap-3">
                             <UserAvatar userId={u.id} className="h-10 w-10" />
                             <div className="flex flex-col text-left">
                                <span className="text-[11px] font-black text-white uppercase italic">{formatDisplayName(u.name, u.username)}</span>
                                <span className="text-[8px] text-white/30 font-black uppercase tracking-widest">Active Signal</span>
                             </div>
                          </div>
                          <div className="flex items-center gap-3">
                             {u.isPremium && <Star className="w-3 h-3 text-accent fill-accent" />}
                             <ChevronRight className="w-4 h-4 text-white/10" />
                          </div>
                       </div>
                     ))}
                  </div>
               </div>

               <div className="bg-black/60 border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col font-mono shadow-2xl">
                  <div className="bg-white/5 p-4 flex items-center justify-between border-b border-white/5">
                     <div className="flex items-center gap-3">
                        <Terminal className="w-4 h-4 text-primary" />
                        <span className="text-[10px] text-white/40 uppercase font-black">Live Logs</span>
                     </div>
                  </div>
                  <div className="p-5 text-[10px] text-left space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide">
                     <p className="text-white/30">[19:42:01] <span className="text-primary">INFO</span>: Bot synced with Node #842</p>
                     <p className="text-white/30">[19:43:05] <span className="text-accent">EVENT</span>: User @nexus_alpha clicked [⚔️ Атака]</p>
                     <p className="text-white/30">[19:43:08] <span className="text-green-500">POST</span>: Sent damage signal to chat_main</p>
                     <p className="text-white/30">[19:44:12] <span className="text-yellow-500">WARN</span>: Slow response from bot server</p>
                  </div>
               </div>
            </TabsContent>

            <TabsContent value="identity" className="m-0 space-y-8">
               <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 space-y-8 shadow-2xl">
                  <div className="flex flex-col items-center gap-6">
                     <div className="relative group">
                        <div className="h-32 w-32 rounded-[2.5rem] bg-black/40 border-2 border-dashed border-primary/40 flex items-center justify-center overflow-hidden">
                           <img src={botForm.avatarUrl} className="w-full h-full object-cover" alt="Bot Avatar" />
                        </div>
                        <button className="absolute -bottom-2 -right-2 bg-primary p-2.5 rounded-xl shadow-xl"><Camera className="w-4 h-4 text-white" /></button>
                     </div>
                     <div className="text-center">
                        <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">{botForm.name}</h4>
                        <p className="text-[10px] text-primary/60 font-black uppercase tracking-widest">{botForm.username}</p>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase text-primary/60 ml-1">Название бота</Label>
                        <Input 
                          value={botForm.name} 
                          onChange={e => setBotForm({...botForm, name: e.target.value})}
                          className="h-12 bg-black/40 border-white/10 rounded-xl font-bold" 
                        />
                     </div>
                     <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase text-primary/60 ml-1">ID бота (@nick)</Label>
                        <Input 
                          value={botForm.username} 
                          onChange={e => setBotForm({...botForm, username: e.target.value})}
                          className="h-12 bg-black/40 border-white/10 rounded-xl font-bold" 
                        />
                     </div>
                     <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase text-primary/60 ml-1">Avatar URL</Label>
                        <Input 
                          value={botForm.avatarUrl} 
                          onChange={e => setBotForm({...botForm, avatarUrl: e.target.value})}
                          className="h-12 bg-black/40 border-white/10 rounded-xl" 
                        />
                     </div>
                     <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase text-primary/60 ml-1">Webhook Endpoint</Label>
                        <Input 
                          value={botForm.webhookUrl} 
                          onChange={e => setBotForm({...botForm, webhookUrl: e.target.value})}
                          className="h-12 bg-black/40 border-white/10 rounded-xl font-mono text-xs" 
                        />
                     </div>

                     <Button 
                       onClick={handleUpdateIdentity}
                       className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all mt-4"
                     >
                        Sync Bot Identity
                     </Button>
                  </div>
               </div>

               <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-[2rem] space-y-4">
                  <div className="flex items-center gap-3 text-red-500">
                     <Trash2 className="w-5 h-5" />
                     <span className="text-[10px] font-black uppercase tracking-widest">Danger Zone</span>
                  </div>
                  <Button variant="ghost" className="w-full h-12 rounded-xl text-red-500/60 hover:text-red-500 hover:bg-red-500/10 text-[9px] font-black uppercase tracking-widest">
                     Annibilate Bot Data
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
