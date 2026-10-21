"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppState } from '@/lib/app-state';
import { useFirestore, useUser } from '@/firebase/provider';
import { Users, Radio, MessageSquarePlus, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ChatType } from '@/lib/types';
import { collection, addDoc } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { triggerHaptic } from '@/lib/utils';

interface CreateChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * CREATE CHAT MODAL V166.0 «CLEAN SLATE»
 * FIXED: Removed all merge conflict markers.
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
        senderName: 'Nuxus Kernel',
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
      <DialogContent className="max-w-[400px] p-0 overflow-hidden bg-[#0a0a0c]/95 backdrop-blur-[40px] border-white/10 rounded-[3rem] shadow-2xl outline-none">
        
        <DialogClose className="absolute right-6 top-6 z-[100] h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
          <X className="w-5 h-5" />
        </DialogClose>

        <DialogHeader className="p-8 pb-4 relative z-10">
          <div className="flex items-center gap-3 mb-2">
             <div className="bg-primary/20 p-2 rounded-xl border border-primary/20">
               <MessageSquarePlus className="w-5 h-5 text-primary" />
             </div>
             <DialogTitle className="text-2xl font-black text-white italic tracking-tighter uppercase">
               {step === 'select' ? 'Сообщество' : `Инициализация`}
             </DialogTitle>
          </div>
        </DialogHeader>

        {step === 'select' ? (
          <div className="p-8 pt-2 space-y-8 relative z-10">
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => { triggerHaptic(); setType('group'); setStep('details'); }} className="h-40 rounded-[2.2rem] border border-white/5 bg-white/[0.02] hover:border-primary/40 transition-all flex flex-col items-center justify-center gap-3 active:scale-95">
                 <Users className="w-8 h-8 text-primary" />
                 <span className="text-[11px] font-black uppercase text-white">Группа</span>
              </button>
              <button onClick={() => { triggerHaptic(); setType('channel'); setStep('details'); }} className="h-40 rounded-[2.2rem] border border-white/5 bg-white/[0.02] hover:border-accent/40 transition-all flex flex-col items-center justify-center gap-3 active:scale-95">
                 <Radio className="w-8 h-8 text-accent" />
                 <span className="text-[11px] font-black uppercase text-white">Канал</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 pt-2 space-y-6 relative z-10">
            <div className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-primary/60 ml-2 tracking-widest">Название</label>
                <Input placeholder="Название..." value={name} onChange={e => setName(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-2xl text-lg font-black" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-primary/60 ml-2 tracking-widest">ID узла</label>
                <Input placeholder="@unique_id" value={username} onChange={e => setUsername(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-2xl font-mono" />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                className="flex-1 rounded-2xl h-14 bg-primary text-white font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all text-xs" 
                onClick={createGroupOrChannel}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Инициализация'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}