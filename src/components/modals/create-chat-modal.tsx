
"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppState } from '@/lib/store';
import { useFirestore, useUser } from '@/firebase';
import { Users, Radio, MessageSquarePlus, ArrowRight, Loader2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ChatType } from '@/lib/types';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface CreateChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateChatModal({ open, onOpenChange }: CreateChatModalProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { setCurrentChatId, setIsSearchOpen } = useAppState();
  const [step, setStep] = useState<'select' | 'details'>('select');
  const [type, setType] = useState<ChatType>('private');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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
        isPublic: true
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
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); setStep('select'); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-card/95 backdrop-blur-xl border-border/40">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            {step === 'select' ? <MessageSquarePlus className="w-5 h-5 text-primary" /> : <ArrowRight className="w-5 h-5 text-primary" />}
            {step === 'select' ? 'Новое сообщество' : `Создание ${type === 'group' ? 'группы' : 'канала'}`}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' ? 'Выберите тип сообщества или найдите друга' : 'Укажите детали вашего сообщества'}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' ? (
          <div className="flex flex-col p-6 pt-2 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="rounded-2xl h-24 flex flex-col items-center justify-center gap-2 border-primary/20 hover:bg-primary/10 transition-all group"
                onClick={() => { setType('group'); setStep('details'); }}
              >
                <div className="bg-primary/10 p-3 rounded-xl group-hover:bg-primary/20 transition-colors">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <span className="text-[10px] font-black tracking-widest uppercase">Группа</span>
              </Button>
              <Button 
                variant="outline" 
                className="rounded-2xl h-24 flex flex-col items-center justify-center gap-2 border-accent/20 hover:bg-accent/10 transition-all group"
                onClick={() => { setType('channel'); setStep('details'); }}
              >
                <div className="bg-accent/10 p-3 rounded-xl group-hover:bg-accent/20 transition-colors">
                  <Radio className="w-6 h-6 text-accent" />
                </div>
                <span className="text-[10px] font-black tracking-widest uppercase">Канал</span>
              </Button>
            </div>

            <div className="pt-2">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 text-center">ИЛИ</div>
              <Button 
                variant="secondary" 
                className="w-full h-12 rounded-2xl gap-3 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-black/20"
                onClick={() => { onOpenChange(false); setIsSearchOpen(true); }}
              >
                <Search className="w-4 h-4 text-primary" /> Найти пользователя
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 rounded-[2.5rem] bg-primary/10 border-2 border-dashed border-primary/40 flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-all">
                {type === 'group' ? <Users className="w-8 h-8 text-primary" /> : <Radio className="w-8 h-8 text-accent" />}
              </div>
            </div>
            <div className="space-y-4">
              <Input 
                placeholder={type === 'group' ? 'Название группы' : 'Название канала'} 
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-12 bg-muted/30 border-white/5 rounded-2xl text-lg font-semibold"
              />
              <Input 
                placeholder={`@${type === 'group' ? 'group' : 'channel'}_id`} 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="h-12 bg-muted/30 border-white/5 rounded-2xl font-mono"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="ghost" className="flex-1 rounded-2xl h-12 font-bold" onClick={() => setStep('select')}>Назад</Button>
              <Button 
                className="flex-1 rounded-2xl h-12 shadow-lg shadow-primary/20 font-black uppercase tracking-widest bg-primary" 
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
