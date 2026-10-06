
"use client"

import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, useUser } from '@/firebase/provider';
import { collection, query, where, getDocs, limit, addDoc } from 'firebase/firestore';
import { useAppState } from '@/lib/app-state';
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2, ArrowRight, Globe, User, MessageSquare } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { cn } from '@/lib/utils';

type SearchFilter = 'all' | 'users' | 'groups';

/**
 * ГЛОБАЛЬНЫЙ ПОИСК V102.0 «ORDER PROTOCOL»
 * Удалены боты, исправлена логика создания дубликатов чатов.
 */
export function GlobalSearchModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const { user } = useUser();
  const db = useFirestore();
  const { setCurrentChatId, setActiveView, setInspectedUserId } = useAppState();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('all');
  const [results, setResults] = useState<{ type: 'chat' | 'user', data: any }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = useCallback(async (val: string) => {
    setSearchQuery(val);
    if (val.trim().length < 2 || !db) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const input = val.toLowerCase().trim();
      const searchTarget = input.startsWith('@') ? input : '@' + input;
      
      const foundResults: any[] = [];

      const userQ = query(
        collection(db, 'users'),
        where('usernameLowercase', '>=', searchTarget),
        where('usernameLowercase', '<=', searchTarget + '\uf8ff'),
        limit(20)
      );

      const [userSnap] = await Promise.all([getDocs(userQ)]);

      userSnap.docs.forEach(d => {
        const data = d.data();
        if (d.id !== user?.uid && !foundResults.some(r => r.data.id === d.id)) {
          foundResults.push({ type: 'user', data: { id: d.id, ...data } });
        }
      });

      if (activeFilter === 'all' || activeFilter === 'groups') {
        const chatQ = query(collection(db, 'chats'), where('isPublic', '==', true), limit(10));
        const chatSnap = await getDocs(chatQ);
        chatSnap.docs.forEach(d => {
          const data = d.data();
          if (data.username?.toLowerCase().includes(input) || data.name?.toLowerCase().includes(input)) {
            foundResults.push({ type: 'chat', data: { id: d.id, ...data } });
          }
        });
      }

      let filtered = foundResults;
      if (activeFilter === 'users') filtered = foundResults.filter(r => r.type === 'user');
      if (activeFilter === 'groups') filtered = foundResults.filter(r => r.type === 'chat');

      setResults(filtered);
    } catch (e) {
      console.error("Search Error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [db, activeFilter, user?.uid]);

  const handleSelectResult = async (res: { type: 'chat' | 'user', data: any }) => {
    if (res.type === 'user') {
      setInspectedUserId(res.data.id);
      onOpenChange(false);
    } else if (res.type === 'chat') {
      setCurrentChatId(res.data.id);
      setActiveView('chats');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if(!o) { setSearchQuery(''); setResults([]); } }}>
      <DialogContent className="max-w-md bg-[#0a0a0c]/98 backdrop-blur-3xl border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl h-[80vh] flex flex-col outline-none">
        <DialogHeader className="px-6 pt-8 pb-4 shrink-0 space-y-6">
           <DialogTitle className="text-white font-black uppercase italic tracking-tighter text-2xl">Discovery Hub</DialogTitle>
           <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
              <Input placeholder="Имя, ник (@) или ID..." value={searchQuery} onChange={e => handleSearch(e.target.value)} className="bg-white/5 border-white/10 h-14 rounded-2xl pl-12 text-lg focus:border-primary/40 transition-all font-bold" autoFocus />
              {isLoading && <div className="absolute right-4 top-1/2 -translate-y-1/2"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>}
           </div>
           <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
              {[
                { id: 'all', label: 'Все', icon: Globe },
                { id: 'users', label: 'Люди', icon: User },
                { id: 'groups', label: 'Группы', icon: MessageSquare }
              ].map(f => (
                <button key={f.id} onClick={() => { setActiveFilter(f.id as any); handleSearch(searchQuery); }} className={cn("flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap", activeFilter === f.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-white/5 text-muted-foreground hover:bg-white/10")}>
                  <f.icon className="w-3.5 h-3.5" /> {f.label}
                </button>
              ))}
           </div>
        </DialogHeader>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {results.length > 0 ? (
              results.map((res, idx) => (
                <div key={idx} onClick={() => handleSelectResult(res)} className="flex items-center justify-between p-4 bg-white/5 rounded-[1.8rem] hover:bg-white/10 cursor-pointer border border-white/5 transition-all group">
                   <div className="flex items-center gap-4 min-w-0">
                      <UserAvatar userId={res.type === 'user' ? res.data.id : null} manualAvatarUrl={res.data.avatarUrl} className="h-12 w-12 shrink-0 border border-white/10" fallbackName={res.data.name} />
                      <div className="flex flex-col text-left min-w-0">
                         <span className="font-bold text-white truncate">{res.data.name || 'Анонимный узел'}</span>
                         <span className="text-[10px] text-muted-foreground uppercase font-black truncate tracking-widest">
                           {res.data.username} {res.type === 'chat' && `• ${res.data.type}`}
                         </span>
                      </div>
                   </div>
                   <ArrowRight className="w-5 h-5 text-primary/40 shrink-0 group-hover:translate-x-1 transition-transform" />
                </div>
              ))
            ) : searchQuery.length >= 2 ? (
              <div className="flex flex-col items-center justify-center py-24 opacity-20">
                 <Search className="w-16 h-16 mb-4" />
                 <p className="text-[11px] font-black uppercase tracking-[0.5em] text-center">Узел не обнаружен</p>
              </div>
            ) : (
              <div className="p-10 text-center opacity-30">
                 <p className="text-[10px] font-black uppercase tracking-[0.3em]">Начните ввод для сканирования сети</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
