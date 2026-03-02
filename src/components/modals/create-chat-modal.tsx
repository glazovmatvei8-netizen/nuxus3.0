
"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppState } from '@/lib/store';
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Users, Radio, MessageSquarePlus, ArrowRight, Loader2, Contact, Lock, Star } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import type { ChatType, User } from '@/lib/types';
import { collection, query, addDoc, getDocs, where, limit, doc } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { isUserPremium } from '@/lib/utils';

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

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);
  const { data: currentUserProfile } = useDoc<User>(userProfileRef);

  const usersQuery = useMemoFirebase(() => {
    if (!db || search.length < 2) return null;
    return query(collection(db, 'users'), limit(50));
  }, [db, search]);

  const { data: allUsers } = useCollection<User>(usersQuery);

  const filteredUsers = (allUsers || []).filter(u => {
    if (u.id === user?.uid) return false;
    const searchLower = search.toLowerCase();
    return u.name?.toLowerCase().includes(searchLower) || 
           u.username?.toLowerCase().includes(searchLower) || 
           u.phone?.includes(search);
  });

  const startPrivateChat = async (otherUser: User) => {
    if (!db || !user || !currentUserProfile) return;

    const otherCanBeMessagedBy = otherUser.settings?.privacy?.whoCanMessageMe || 'everybody';
    if (otherCanBeMessagedBy === 'premium' && !isUserPremium(currentUserProfile)) {
      toast({ 
        title: "Доступ ограничен", 
        description: "Этот пользователь разрешил писать себе только Premium участникам.", 
        variant: "destructive" 
      });
      return;
    }

    setIsLoading(true);
    try {
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
        participantIds: [user.uid, otherUser.id],
        adminIds: [user.uid, otherUser.id], 
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        isPublic: false,
        metadata: {
          [user.uid]: {
            name: currentUserProfile.name,
            username: currentUserProfile.username,
            avatarUrl: currentUserProfile.avatarUrl || null,
            isPremium: isUserPremium(currentUserProfile)
          },
          [otherUser.id]: {
            name: otherUser.name,
            username: otherUser.username,
            avatarUrl: otherUser.avatarUrl || null,
            isPremium: isUserPremium(otherUser)
          }
        },
        name: otherUser.name,
        username: otherUser.username,
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
      const formattedUsername = username.startsWith('@') ? username.toLowerCase() : '@' + username.toLowerCase();
      
      const newChatData = {
        type: type,
        name: name,
        username: formattedUsername,
        avatarUrl: null,
        participantIds: [user.uid],
        adminIds: [user.uid],
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        isPublic: true // По умолчанию публичные
      };

      const docRef = await addDoc(collection(db, 'chats'), newChatData);
      
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
            {step === 'select' ? 'Новая связь' : `Создание ${type === 'group' ? 'группы' : 'канала'}`}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' ? 'Найдите пользователя для общения' : 'Укажите детали вашего сообщества'}
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
                  placeholder="Поиск..." 
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
                      Введите ник или телефон для поиска
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
                          <span className="font-semibold text-sm group-hover:text-primary transition-colors truncate flex items-center gap-1">
                            {u.name}
                            {isUserPremium(u) && <Star className="w-3 h-3 text-accent fill-accent" />}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{u.phone}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground block truncate">{u.username}</span>
                          {u.settings?.privacy?.whoCanMessageMe === 'premium' && (
                            <div className="flex items-center gap-1 text-[9px] text-accent font-bold">
                              <Lock className="w-2.5 h-2.5" /> Только Premium
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground text-sm italic">
                    Никто не найден
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
                {isLoading ? <Loader2 className="animate-spin" /> : `Создать`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
