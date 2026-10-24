"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppState } from '@/lib/app-state';
import { useFirestore, useUser } from '@/firebase/provider';
import { Users, Radio, MessageSquarePlus, X, Loader2, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ChatType } from '@/lib/types';
import { collection, addDoc } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { triggerHaptic } from '@/lib/utils';
import { NuxusLogo } from '../nuxus-logo';

interface CreateChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * CREATE CHAT MODAL V211.0 «TITANIUM RESTORATION»
 * ОПТИМИЗИРОВАНО: Убрана фиолетовая плашка, возвращен лаконичный стиль MIG.
 */
export function CreateChatModal({ open, onOpenChange }: CreateChatModalProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { setCurrentChatId } = useAppState();
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
    triggerHaptic();
    try {
      const formattedUsername = username.startsWith('@') ? username.toLowerCase() : '@' + username.toLowerCase();
      
      const newChatData = {
        type: type,
        name: name.trim(),
        username: formattedUsername,
        avatarUrl: null,
        participantIds: [user.uid],
        adminIds: [user.uid],
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        isPublic: true,
        metadata: {} 
      };

      const docRef = await addDoc(collection(db, 'chats'), newChatData);
      
      const messagesCol = collection(db, 'chats', docRef.id, 'messages');
      addDocumentNonBlocking(messagesCol, {
        chatId: docRef.id,
        senderId: 'system',
        senderName: 'MIG Kernel',
        content: `${type === 'group' ? 'Группа' : 'Канал'} успешно инициализирована!`,
        contentType: 'service',
        sentAt: new Date().toISOString(),
      });

      setCurrentChatId(docRef.id);
      onOpenChange(false);
      toast({ title: "Узел создан" });
    } catch (error: any) {
      console.error("Create chat error in create-chat-modal:", error);
      toast({ title: "Ошибка создания", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if(!val) setStep('select'); }}>
      <DialogContent className="max-w-[400px] p-0 overflow-hidden bg-[#0a0a0c]/95 backdrop-blur-[60px] border-white/10 rounded-[2.5rem] shadow-2xl outline-none">
        
        <DialogHeader className="px-8 pt-10 pb-4">
           <div className="flex items-center justify-between w-full mb-6">
              {step === 'details' ? (
                <button onClick={() => setStep('select')} className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all">
                  <ChevronLeft className="w-6 h-6" />
                </button>
              ) : <div className="w-10" />}
              <NuxusLogo size={40} className="opacity-80" />
              <DialogClose className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all">
                <X className="w-5 h-5" />
              </DialogClose>
           </div>
           <DialogTitle className="text-2xl font-black text-white italic tracking-tight uppercase text-center w-full">
             {step === 'select' ? 'Сообщество' : `Инициализация`}
           </DialogTitle>
           <DialogDescription className="text-[10px] font-bold text-primary/40 uppercase tracking-widest text-center w-full mt-1">
             {step === 'select' ? 'Выберите тип кластера' : 'Настройте параметры узла'}
           </DialogDescription>
        </DialogHeader>

        {step === 'select' ? (
          <div className="p-8 pt-2 space-y-8 relative z-10">
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => { triggerHaptic(); setType('group'); setStep('details'); }} className="h-44 rounded-[2.5rem] border border-white/5 bg-white/[0.02] hover:border-primary/40 transition-all flex flex-col items-center justify-center gap-4 active:scale-95 group shadow-xl">
                 <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                    <Users className="w-8 h-8 text-primary" />
                 </div>
                 <span className="text-[12px] font-black uppercase text-white tracking-widest">Группа</span>
              </button>
              <button onClick={() => { triggerHaptic(); setType('channel'); setStep('details'); }} className="h-44 rounded-[2.5rem] border border-white/5 bg-white/[0.02] hover:border-primary/40 transition-all flex flex-col items-center justify-center gap-4 active:scale-95 group shadow-xl">
                 <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                    <Radio className="w-8 h-8 text-primary" />
                 </div>
                 <span className="text-[12px] font-black uppercase text-white tracking-widest">Канал</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 pt-2 space-y-8 relative z-10">
            <div className="space-y-5 text-left">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-primary/60 ml-3 tracking-widest">Название</label>
                <Input placeholder="Введите название..." value={name} onChange={e => setName(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-2xl text-lg font-black" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-primary/60 ml-3 tracking-widest">ID узла</label>
                <Input placeholder="@unique_id" value={username} onChange={e => setUsername(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-2xl font-mono text-primary" />
              </div>
            </div>

            <Button 
              className="w-full rounded-2xl h-16 bg-primary text-white font-black uppercase italic tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all text-sm mt-4" 
              onClick={createGroupOrChannel}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : 'Активировать узел'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}