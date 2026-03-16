
"use client"

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useAppState } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2, ArrowRight, Zap, Globe, Star, Users, User, Bot } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { cn } from '@/lib/utils';
import type { Chat } from '@/lib/types';

type SearchFilter = 'all' | 'users' | 'groups' | 'bots';

/**
 * FIXED Global Search Modal v2.2
 * Исправлена синтаксическая ошибка и улучшен поиск людей.
 */
export function GlobalSearchModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const { user } = useUser();
  const db = useFirestore();
  const { setCurrentChatId, setActiveView, setInspectedUserId } = useAppState();
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
          console.warn("Nuxus Discovery: Offline Mode");
        } finally {
          setIsLoading(false);
        }
      };
      fetchDiscoveryData();
    }
  }, [open, searchQuery, db]);

  const handleSearch = async (val: string) => {
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
      if ('@stickers'.includes(cleanVal) && (activeFilter === 'all' || activeFilter === 'bots')) {
        foundResults.push({ type: 'bot', data: { id: 'bot_stickers', name: 'Sticker Bot 🎨', username: '@stickers', avatarUrl: 'https://i.ibb.co/sd2MqGz2/Icon.png' } });
      }

      // 2. Группы и Каналы
      if (activeFilter === 'all' || activeFilter === 'groups') {
        const chatQuery = query(
          collection(db, 'chats'), 
          where('username', '==', withAt), 
          where('isPublic', '==', true),
          limit(10)
        );
        const chatSnap = await getDocs(chatQuery);
        chatSnap.docs.forEach(d => {
          const data = d.data();
          if (data.type !== 'private') {
            foundResults.push({ type: 'chat', data: { id: d.id, ...data } });
          }
        });
      }

      // 3. Пользователи (Узлы) - Глубокий поиск
      if (activeFilter === 'all' || activeFilter === 'users') {
        const queries = [
          query(collection(db, 'users'), where('username', '==', withAt), limit(5)),
          query(collection(db, 'users'), where('username', '==', withoutAt), limit(5)),
          query(collection(db, 'users'), where('name', '==', val), limit(5))
        ];

        for (const q of queries) {
          const snap = await getDocs(q);
          snap.docs.forEach(d => {
            const data = d.data();
            if (d.id !== user?.uid && !foundResults.some(r => r.data.id === d.id)) {
              foundResults.push({ type: 'user', data: { id: d.id, ...data } });
            }
          });
        }
      }

      setResults(foundResults);
    } catch (e) {
      console.error("Nuxus Search: Signal error", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectResult = (res: { type: 'chat' | 'user' | 'bot', data: any }) => {
    if (res.type === 'user') {
      setInspectedUserId(res.data.id);
      onOpenChange(false);
    } else if (res.type === 'chat') {
      setCurrentChatId(res.data.id);
      setActiveView('chats');
      onOpenChange(false);
    }
  };

  const renderContent = () => {
    if (results.length > 0) {
      return (
        <div className="space-y-2">
          {results.map((res, idx) => (
            <div key={idx} onClick={() => handleSelectResult(res)} className="flex items-center justify-between p-4 bg-white/5 rounded-[1.8rem] hover:bg-white/10 cursor-pointer border border-white/5 transition-all">
              <div className="flex items-center gap-4">
                <UserAvatar userId={res.type === 'user' ? res.data.id : null} manualAvatarUrl={res.data.avatarUrl} className="h-12 w-12" fallbackName={res.data.name} />
                <div className="flex flex-col">
                  <span className="font-bold text-white flex items-center gap-2">
                    {res.data.name} 
                    {res.data.isPremium && <Star className="w-3 h-3 text-accent fill-accent" />}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase font-black">
                    {res.data.username} • {res.type === 'user' ? 'профиль' : res.type === 'chat' ? 'сообщество' : 'бот'}
                  </span>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-primary/40" />
            </div>
          ))}
        </div>
      );
    }

    if (searchQuery.length < 2 && trends.length > 0) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2 text-primary">
            <Zap className="w-4 h-4 fill-current animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Популярное в Ядре</span>
          </div>
          {trends.map(chat => (
            <div key={chat.id} onClick={() => handleSelectResult({ type: 'chat', data: chat })} className="flex items-center justify-between p-4 bg-white/5 rounded-[1.8rem] hover:bg-white/10 cursor-pointer border border-white/5 transition-all">
              <div className="flex items-center gap-4">
                <UserAvatar userId={null} manualAvatarUrl={chat.avatarUrl} className="h-12 w-12" fallbackName={chat.name} />
                <div className="flex flex-col">
                  <span className="font-bold text-white">{chat.name}</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-black">{chat.username}</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-8 rounded-xl text-[9px] uppercase font-black text-primary">Вступить</Button>
            </div>
          ))}
        </div>
      );
    }

    if (searchQuery.length >= 2 && !isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 opacity-20">
          <Search className="w-12 h-12 mb-4" />
          <p className="text-[10px] font-black uppercase tracking-widest text-center">Сигнал не найден</p>
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl h-[80vh] flex flex-col outline-none">
        <DialogHeader className="p-6 pb-0 shrink-0">
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
            <SearchFilterBtn label="Все" active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} icon={Globe} />
            <SearchFilterBtn label="Люди" active={activeFilter === 'users'} onClick={() => setActiveFilter('users')} icon={User} />
            <SearchFilterBtn label="Группы" active={activeFilter === 'groups'} onClick={() => setActiveFilter('groups')} icon={Users} />
            <SearchFilterBtn label="Боты" active={activeFilter === 'bots'} onClick={() => setActiveFilter('bots')} icon={Bot} />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 pt-0">
            {renderContent()}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function SearchFilterBtn({ label, active, onClick, icon: Icon }: any) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap", active ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-white/5 text-muted-foreground hover:bg-white/10")}>
      <Icon className="w-3 h-3" /> {label}
    </button>
  );
}
