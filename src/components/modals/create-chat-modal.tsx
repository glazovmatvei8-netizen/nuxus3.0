
"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppState } from '@/lib/store';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Users, Radio, MessageSquarePlus, ArrowRight, Loader2, Contact } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import type { ChatType } from '@/lib/types';
import { collection, query, addDoc, getDocs, where, limit } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface CreateChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateChatModal({ open, onOpenChange }: CreateChatModalProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { setCurrentChatId } = useAppState();
  const [search, setSearch] = useState('');
  const [step, setStep] = useState<'select' | 'details'>('select');
  const [type, setType] = useState<ChatType>('private');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Optimized search query: only query if we have a search term
  // We search for exact matches on username or phone, and a small subset of users for name
  const usersQuery = useMemoFirebase(() => {
    if (!db || search.length < 2) return null;
    
    // For a real production app with 2M users, you'd use a search service (Algolia/Elastic)
    // Here we fetch a limited subset to keep it fast
    return query(collection(db, 'users'), limit(50));
  }, [db, search]);

  const { data: allUsers } = useCollection(usersQuery);

  const filteredUsers = (allUsers || []).filter(u => {
    if (u.id === user?.uid) return false;
    
    const searchLower = search.toLowerCase();
    const nameMatch = u.name?.toLowerCase().includes(searchLower);
    const usernameMatch = u.username?.toLowerCase().includes(searchLower);
    const phoneMatch = u.phone?.replace(/\D/g, '').includes(search.replace(/\D/g, ''));
    
    return nameMatch || usernameMatch || phoneMatch;
  });

  const startPrivateChat = async (otherUser: any) => {
    if (!db || !user) return;
    setIsLoading(true);
    try {
      // Check for existing private chat between these two specific users
      const q = query(
        collection(db, 'chats'),
        where('type', '==', 'private'),
        where('participantIds', 'array-contains', user.uid)
      );
      const snapshot = await getDocs(q);
      const existing = snapshot.docs.find(d => {
        const pIds = d.data().participantIds;
        return pIds.includes(otherUser.id) && pIds.length === 2;
      });

      if (existing) {
        setCurrentChatId(existing.id);
        onOpenChange(false);
        return;
      }

      const newChatData = {
        type: 'private' as const,
        name: otherUser.name,
        username: otherUser.username,
        avatarUrl: otherUser.avatarUrl || null,
        participantIds: [user.uid, otherUser.id],
        adminIds: [user.uid],
        createdAt: new Date().toISOString(),
        ownerId: user.uid,
      };

      const docRef = await addDoc(collection(db, 'chats'), newChatData);
      setCurrentChatId(docRef.id);
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const createGroupOrChannel = async () => {
    if (!name || !username || !db || !user) {
      toast({ title: "Ошибка", description: "Заполните все поля", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const formattedUsername = username.startsWith('@') ? username : '@' + username;
      const newChatData = {
        type: type,
        name: name,
        username: formattedUsername,
        avatarUrl: null,
        participantIds: [user.uid],
        adminIds: [user.uid],
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'chats'), newChatData);
      
      // Add welcome message
      const messagesCol = collection(db, 'chats', docRef.id, 'messages');
      addDocumentNonBlocking(messagesCol, {
        chatId: docRef.id,
        senderId: 'system',
        senderName: 'Nuxus',
        content: `${type === 'group' ? 'Группа' : 'Канал'} создана!`,
        contentType: 'service',
        sentAt: new Date().toISOString(),
      });

      setCurrentChatId(docRef.id);
      onOpenChange(false);
      toast({ title: "Успех", description: `${type === 'group' ? 'Группа' : 'Канал'} создана!` });
    } catch (error: any) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); setStep('select'); setSearch(''); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-card/95 backdrop-blur-xl border-border/40">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            {step === 'select' ? <MessageSquarePlus className="w-5 h-5 text-primary" /> : <ArrowRight className="w-5 h-5 text-primary" />}
            {step === 'select' ? 'Новое сообщение' : `Создание ${type === 'group' ? 'группы' : 'канала'}`}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' ? 'Найдите друга по имени, @нику или телефону' : 'Укажите детали вашего сообщества'}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' ? (
          <div className="flex flex-col">
            <div className="px-6 py-4 space-y-4">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1 rounded-xl h-14 flex flex-col items-center justify-center gap-1 border-primary/20 hover:bg-primary/10 transition-colors"
                  onClick={() => { setType('group'); setStep('details'); }}
                >
                  <Users className="w-5 h-5 text-primary" />
                  <span className="text-[10px] font-bold">ГРУППА</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 rounded-xl h-14 flex flex-col items-center justify-center gap-1 border-accent/20 hover:bg-accent/10 transition-colors"
                  onClick={() => { setType('channel'); setStep('details'); }}
                >
                  <Radio className="w-5 h-5 text-accent" />
                  <span className="text-[10px] font-bold">КАНАЛ</span>
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Имя, @ник или номер телефона..." 
                  className="pl-9 h-11 bg-muted/30 border-muted-foreground/10 rounded-xl"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="h-[300px] border-t border-border/40">
              <div className="p-2 space-y-1">
                {search.length < 2 ? (
                  <div className="p-8 text-center space-y-3">
                    <div className="bg-muted/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                      <Contact className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      Начните вводить данные для поиска ваших контактов
                    </p>
                  </div>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map(u => (
                    <div
                      key={u.id}
                      onClick={() => startPrivateChat(u)}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-primary/10 cursor-pointer group transition-all"
                    >
                      <Avatar className="h-10 w-10 border-2 border-transparent group-hover:border-primary/20">
                        <AvatarImage src={u.avatarUrl || ''} />
                        <AvatarFallback className="bg-primary/20 text-primary font-bold uppercase">{u.name?.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm group-hover:text-primary transition-colors truncate">{u.name}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{u.phone}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground block truncate">{u.username}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground text-sm italic">
                    Пользователи не найдены
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-dashed border-primary/40 flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-all">
                {type === 'group' ? <Users className="w-8 h-8 text-primary" /> : <Radio className="w-8 h-8 text-accent" />}
              </div>
            </div>
            <div className="space-y-4">
              <Input 
                placeholder={type === 'group' ? 'Название группы' : 'Название канала'} 
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-12 bg-muted/30 border-muted-foreground/10 rounded-xl text-lg font-semibold"
              />
              <Input 
                placeholder={`@${type === 'group' ? 'group' : 'channel'}_id`} 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="h-12 bg-muted/30 border-muted-foreground/10 rounded-xl"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="ghost" className="flex-1 rounded-xl" onClick={() => setStep('select')}>Назад</Button>
              <Button 
                className="flex-1 rounded-xl h-11 shadow-lg shadow-primary/20 font-bold" 
                onClick={createGroupOrChannel}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="animate-spin" /> : `Создать ${type === 'group' ? 'группу' : 'канал'}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
