
"use client"

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, limit } from 'firebase/firestore';
import { useAppState } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2, Radio, Users, Check, ArrowRight, X } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { cn, formatDisplayName } from '@/lib/utils';
import type { Chat } from '@/lib/types';

export function GlobalSearchModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const { user } = useUser();
  const db = useFirestore();
  const { setCurrentChatId, setActiveView } = useAppState();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.length < 3) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      // Normalize search string: force lowercase and handle @
      const searchVal = val.startsWith('@') ? val.toLowerCase() : '@' + val.toLowerCase();
      
      const q = query(
        collection(db!, 'chats'),
        where('username', '==', searchVal),
        limit(5)
      );
      
      const snap = await getDocs(q);
      const found: Chat[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Chat));
      setResults(found);
    } catch (e) {
      console.error("Search error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const joinAndOpen = async (chat: Chat) => {
    if (!user || !db) return;
    
    try {
      if (!chat.participantIds.includes(user.uid)) {
        await updateDoc(doc(db, 'chats', chat.id), {
          participantIds: arrayUnion(user.uid)
        });
        toast({ title: "Успех", description: `Вы присоединились к ${chat.name}` });
      }
      
      setCurrentChatId(chat.id);
      setActiveView('chats');
      onOpenChange(false);
      setSearchQuery('');
      setResults([]);
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card/90 backdrop-blur-2xl border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-2xl font-black uppercase italic text-white tracking-tighter flex items-center gap-2">
            <Search className="w-6 h-6 text-primary" /> Поиск Nuxus
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Найдите канал или группу по никнейму
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
            <Input 
              placeholder="Введите @username канала..." 
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              className="bg-white/5 border-white/5 h-14 rounded-2xl pl-12 text-lg focus:border-primary/50 transition-all"
              autoFocus
            />
            {isLoading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            )}
          </div>
        </div>

        <ScrollArea className="h-[350px] px-2">
          <div className="p-4 space-y-3">
            {results.length > 0 ? (
              results.map(chat => {
                const isMember = user && chat.participantIds.includes(user.uid);
                return (
                  <div 
                    key={chat.id} 
                    className="flex items-center justify-between p-4 bg-white/5 rounded-[1.8rem] border border-white/5 hover:bg-white/10 transition-all cursor-pointer group"
                    onClick={() => joinAndOpen(chat)}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <UserAvatar userId={null} manualAvatarUrl={chat.avatarUrl} className="h-14 w-14 border border-white/10" fallbackName={chat.name} />
                      <div className="flex flex-col min-w-0">
                        <span className="font-black text-white text-lg truncate flex items-center gap-2">
                          {chat.name}
                          {chat.type === 'channel' ? <Radio className="w-3.5 h-3.5 text-accent" /> : <Users className="w-3.5 h-3.5 text-primary" />}
                        </span>
                        <span className="text-[11px] font-bold text-primary tracking-widest uppercase truncate">{chat.username}</span>
                      </div>
                    </div>
                    
                    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all">
                      {isMember ? <Check className="w-6 h-6" /> : <ArrowRight className="w-6 h-6" />}
                    </Button>
                  </div>
                );
              })
            ) : searchQuery.length >= 3 && !isLoading ? (
              <div className="flex flex-col items-center justify-center p-12 text-center opacity-40">
                <X className="w-12 h-12 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Ничего не найдено</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center opacity-20">
                <Search className="w-16 h-16 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Введите ID для поиска</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
