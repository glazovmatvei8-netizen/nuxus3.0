
"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs, limit, or, and, doc, updateDoc, arrayUnion, addDoc } from 'firebase/firestore';
import { useAppState } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2, ArrowRight, Zap, Globe, Star, Users, User, Bot, ShieldCheck, Plus } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { cn } from '@/lib/utils';
import type { Chat } from '@/lib/types';

type SearchFilter = 'all' | 'users' | 'groups' | 'bots';

export function GlobalSearchModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const { user } = useUser();
  const db = useFirestore();
  const { setCurrentChatId, setActiveView, setInspectedUserId, currentChatId } = useAppState();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('all');
  const [results, setResults] = useState<{ type: 'chat' | 'user' | 'bot', data: any }[]>([]);
  const [trends, setTrends] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && !searchQuery.trim() && db) {
      const fetchDiscoveryData = async () => {
        setIsLoading(true);
        try {
          const chatQ = query(collection(db, 'chats'), where('isPublic', '==', true), limit(15));
          const chatSnap = await getDocs(chatQ);
          setTrends(chatSnap.docs.map(d => ({ id: d.id, ...d.data() } as Chat)));
        } catch (e) {
          console.warn("Nuxus Discovery: Signal issues");
        } finally {
          setIsLoading(false);
        }
      };
      fetchDiscoveryData();
    }
  }, [open, searchQuery, db]);

  const handleSearch = useCallback(async (val: string) => {
    setSearchQuery(val);
    if (val.length < 2 || !db) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const cleanVal = val.toLowerCase().trim();
      const withAt = cleanVal.startsWith('@') ? cleanVal : '@' + cleanVal;
      const withoutAt = cleanVal.replace('@', '');
      
      const foundResults: any[] = [];

      // 1. Боты
      const bots = [
        { type: 'bot' as const, data: { id: 'bot_nuxus_manager', name: 'Nuxus Chat Manager 🛡️', username: '@nuxus_manager', avatarUrl: 'https://i.ibb.co/sd2MqGz2/Icon.png', isPremium: true, isBot: true } },
        { type: 'bot' as const, data: { id: 'bot_stickers', name: 'Sticker Bot 🎨', username: '@stickers', avatarUrl: 'https://i.ibb.co/sd2MqGz2/Icon.png', isBot: true } }
      ];

      bots.forEach(bot => {
        if (bot.data.username.includes(cleanVal) || bot.data.name.toLowerCase().includes(cleanVal)) {
          if (activeFilter === 'all' || activeFilter === 'bots') foundResults.push(bot);
        }
      });

      // 2. Группы и Каналы
      if (activeFilter === 'all' || activeFilter === 'groups') {
        const chatQ = query(
          collection(db, 'chats'), 
          and(
            where('isPublic', '==', true),
            or(
              where('username', '==', withAt),
              where('username', '==', withoutAt),
              where('name', '>=', val),
              where('name', '<=', val + '\uf8ff')
            )
          ),
          limit(15)
        );
        const chatSnap = await getDocs(chatQ);
        chatSnap.docs.forEach(d => {
          const data = d.data();
          if (data.type !== 'private') {
            foundResults.push({ type: 'chat', data: { id: d.id, ...data } });
          }
        });
      }

      // 3. Пользователи
      if (activeFilter === 'all' || activeFilter === 'users') {
        const userQ = query(
          collection(db, 'users'),
          or(
            where('username', '==', withAt),
            where('username', '==', withoutAt),
            where('name', '>=', val),
            where('name', '<=', val + '\uf8ff')
          ),
          limit(20)
        );
        
        const userSnap = await getDocs(userQ);
        userSnap.docs.forEach(d => {
          const data = d.data();
          if (d.id !== user?.uid && !foundResults.some(r => r.data.id === d.id)) {
            foundResults.push({ type: 'user', data: { id: d.id, ...data } });
          }
        });
      }

      setResults(foundResults);
    } catch (e) {
      console.error("Nuxus Search: Signal error", e);
    } finally {
      setIsLoading(false);
    }
  }, [db, activeFilter, user?.uid]);

  const handleSelectResult = async (res: { type: 'chat' | 'user' | 'bot', data: any }) => {
    if (!db) return;

    if (res.type === 'user') {
      setInspectedUserId(res.data.id);
      onOpenChange(false);
    } else if (res.type === 'chat') {
      setCurrentChatId(res.data.id);
      setActiveView('chats');
      onOpenChange(false);
    } else if (res.type === 'bot') {
      if (currentChatId) {
        if (confirm(`Добавить ${res.data.name} в текущий чат?`)) {
          try {
            const chatRef = doc(db, 'chats', currentChatId);
            await updateDoc(chatRef, {
              participantIds: arrayUnion(res.data.id)
            });

            // Отправляем приветственное сообщение от бота
            await addDoc(collection(db, 'chats', currentChatId, 'messages'), {
              chatId: currentChatId,
              senderId: res.data.id,
              senderName: res.data.name,
              content: `${res.data.name} подключен к узлу 🛡️. Используйте !help для списка команд.`,
              contentType: 'service',
              sentAt: new Date().toISOString(),
            });

            toast({ title: "Бот добавлен", description: "Менеджер чата активирован" });
            onOpenChange(false);
          } catch (e) {
            toast({ title: "Ошибка", description: "Недостаточно прав для добавления бота в этот чат", variant: "destructive" });
          }
        }
      } else {
        toast({ title: "Внимание", description: "Сначала откройте группу, в которую хотите добавить бота." });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl h-[80vh] flex flex-col outline-none">
        <DialogHeader className="p-6 pb-0 shrink-0 text-left">
          <DialogTitle className="text-white font-black uppercase italic tracking-tighter text-xl">Signal Discovery</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 shrink-0 space-y-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Поиск по @username..." 
              value={searchQuery} 
              onChange={e => handleSearch(e.target.value)} 
              className="bg-white/5 border-white/10 h-14 rounded-2xl pl-12 text-lg focus:border-primary/40 transition-all" 
              autoFocus 
            />
            {isLoading && <div className="absolute right-4 top-1/2 -translate-y-1/2"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>}
          </div>

          <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
            <button onClick={() => setActiveFilter('all')} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap", activeFilter === 'all' ? "bg-primary text-white" : "bg-white/5 text-muted-foreground")}>
              <Globe className="w-3 h-3" /> Все
            </button>
            <button onClick={() => setActiveFilter('users')} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap", activeFilter === 'users' ? "bg-primary text-white" : "bg-white/5 text-muted-foreground")}>
              <User className="w-3 h-3" /> Люди
            </button>
            <button onClick={() => setActiveFilter('groups')} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap", activeFilter === 'groups' ? "bg-primary text-white" : "bg-white/5 text-muted-foreground")}>
              <Users className="w-3 h-3" /> Группы
            </button>
            <button onClick={() => setActiveFilter('bots')} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap", activeFilter === 'bots' ? "bg-primary text-white" : "bg-white/5 text-muted-foreground")}>
              <Bot className="w-3 h-3" /> Боты
            </button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 pt-0">
            {isLoading ? (
              <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>
            ) : (results.length > 0 ? (
              <div className="space-y-2">
                {results.map((res, idx) => (
                  <div key={idx} onClick={() => res.type !== 'bot' && handleSelectResult(res)} className="flex items-center justify-between p-4 bg-white/5 rounded-[1.8rem] hover:bg-white/10 cursor-pointer border border-white/5 transition-all group">
                    <div className="flex items-center gap-4 min-w-0">
                      <UserAvatar userId={res.type === 'user' ? res.data.id : null} manualAvatarUrl={res.data.avatarUrl} className="h-12 w-12 shrink-0" fallbackName={res.data.name} />
                      <div className="flex flex-col text-left min-w-0">
                        <span className="font-bold text-white flex items-center gap-2 truncate">
                          {res.data.name} 
                          {res.data.isPremium && <Star className="w-3 h-3 text-accent fill-accent" />}
                          {res.data.id === 'bot_nuxus_manager' && <ShieldCheck className="w-3 h-3 text-primary" />}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase font-black truncate">
                          {res.data.username} • {res.type === 'user' ? 'профиль' : res.type === 'chat' ? 'сообщество' : 'бот'}
                        </span>
                      </div>
                    </div>
                    {res.type === 'bot' ? (
                      <Button 
                        size="sm" 
                        className="h-9 px-4 rounded-xl bg-primary text-white font-black uppercase text-[9px] tracking-widest gap-2 shadow-lg shadow-primary/20"
                        onClick={(e) => { e.stopPropagation(); handleSelectResult(res); }}
                      >
                        <Plus className="w-3.5 h-3.5" /> Добавить
                      </Button>
                    ) : (
                      <ArrowRight className="w-5 h-5 text-primary/40 shrink-0 group-hover:translate-x-1 transition-transform" />
                    )}
                  </div>
                ))}
              </div>
            ) : searchQuery.length >= 2 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-20">
                <Search className="w-12 h-12 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-center">Сигнал не найден</p>
              </div>
            ) : trends.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-2 text-primary">
                  <Zap className="w-4 h-4 fill-current animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Популярное в Ядре</span>
                </div>
                {trends.map(chat => (
                  <div key={chat.id} onClick={() => handleSelectResult({ type: 'chat', data: chat })} className="flex items-center justify-between p-4 bg-white/5 rounded-[1.8rem] hover:bg-white/10 cursor-pointer border border-white/5 transition-all">
                    <div className="flex items-center gap-4">
                      <UserAvatar userId={null} manualAvatarUrl={chat.avatarUrl} className="h-12 w-12" fallbackName={chat.name} />
                      <div className="flex flex-col text-left">
                        <span className="font-bold text-white">{chat.name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-black">{chat.username}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 rounded-xl text-[9px] uppercase font-black text-primary">Вступить</Button>
                  </div>
                ))}
              </div>
            ) : null)}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
