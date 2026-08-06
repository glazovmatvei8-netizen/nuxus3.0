
"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppState } from '@/lib/store';
import { useFirestore, useUser } from '@/firebase/provider';
import { Users, Radio, MessageSquarePlus, ArrowRight, Loader2, Search, Zap, Globe, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ChatType } from '@/lib/types';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { cn } from '@/lib/utils';

interface CreateChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * CREATE CHAT MODAL V5.3.0
 * FIXED: Direct imports from provider.
 */
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
        isPublic: true,
        metadata: {} 
      };

      const docRef = await addDoc(collection(db, 'chats'), newChatData);
      
      const messagesCol = collection(db, 'chats', docRef.id, 'messages');
      addDocumentNonBlocking(messagesCol, {
        chatId: docRef.id,
        senderId: 'system',
        senderName: 'Nuxus Kernel',
        content: `${type === 'group' ? 'Группа' : 'Канал'} успешно инициализирована в Ядре!`,
        contentType: 'service',
        sentAt: new Date().toISOString(),
      });

      setCurrentChatId(docRef.id);
      onOpenChange(false);
      toast({ title: "Узел создан", description: `${type === 'group' ? 'Группа' : 'Канал'} готова к работе` });
    } catch (error: any) {
      toast({ title: "Ошибка создания", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); setStep('select'); }}>
      <DialogContent className="max-w-[400px] p-0 overflow-hidden bg-[#0a0a0c]/90 backdrop-blur-[40px] border-white/10 rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] outline-none">
        {/* Background Glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 blur-[80px] rounded-full animate-pulse" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-accent/20 blur-[80px] rounded-full animate-pulse" />
        </div>

        <DialogHeader className="p-8 pb-4 relative z-10">
          <div className="flex items-center gap-3 mb-2">
             <div className="bg-primary/20 p-2 rounded-xl border border-primary/20 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
               <MessageSquarePlus className="w-5 h-5 text-primary" />
             </div>
             <DialogTitle className="text-2xl font-black text-white italic tracking-tighter uppercase">
               {step === 'select' ? 'Новое сообщество' : `Параметры ${type === 'group' ? 'группы' : 'канала'}`}
             </DialogTitle>
          </div>
          <DialogDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 leading-relaxed ml-1">
            {step === 'select' ? 'Выберите тип узла или найдите существующий' : 'Настройте идентификаторы вашего сообщества'}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' ? (
          <div className="p-8 pt-2 space-y-8 relative z-10">
            <div className="grid grid-cols-2 gap-4">
              {/* GROUP CARD */}
              <button 
                onClick={() => { setType('group'); setStep('details'); }}
                className="group relative h-40 rounded-[2.2rem] overflow-hidden border border-white/5 bg-white/[0.02] hover:bg-primary/5 hover:border-primary/40 transition-all duration-500 active:scale-95"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex flex-col items-center justify-center h-full gap-3 relative z-10">
                  <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:bg-primary/20 group-hover:border-primary/30 transition-all duration-500 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                    <Users className="w-7 h-7 text-white group-hover:text-primary transition-colors" />
                  </div>
                  <div className="text-center">
                    <span className="text-[11px] font-black tracking-[0.3em] uppercase text-white group-hover:text-primary transition-colors">Группа</span>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1 opacity-60">До 200к узлов</p>
                  </div>
                </div>
              </button>

              {/* CHANNEL CARD */}
              <button 
                onClick={() => { setType('channel'); setStep('details'); }}
                className="group relative h-40 rounded-[2.2rem] overflow-hidden border border-white/5 bg-white/[0.02] hover:bg-accent/5 hover:border-accent/40 transition-all duration-500 active:scale-95"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex flex-col items-center justify-center h-full gap-3 relative z-10">
                  <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:bg-accent/20 group-hover:border-accent/30 transition-all duration-500 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                    <Radio className="w-7 h-7 text-white group-hover:text-accent transition-colors" />
                  </div>
                  <div className="text-center">
                    <span className="text-[11px] font-black tracking-[0.3em] uppercase text-white group-hover:text-accent transition-colors">Канал</span>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1 opacity-60">Вещание (1 к ∞)</p>
                  </div>
                </div>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
                <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.4em]">или</span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
              </div>

              <button 
                onClick={() => { onOpenChange(false); setIsSearchOpen(true); }}
                className="w-full h-14 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-center gap-3 group hover:bg-white/[0.06] hover:border-white/20 transition-all active:scale-98 shadow-xl"
              >
                <Search className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80">Найти пользователя</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 pt-2 space-y-6 relative z-10">
            <div className="flex justify-center mb-4">
              <div className={cn(
                "w-24 h-24 rounded-[2.8rem] flex items-center justify-center border-2 border-dashed transition-all duration-700 shadow-2xl relative group overflow-hidden",
                type === 'group' ? "bg-primary/5 border-primary/40 shadow-primary/10" : "bg-accent/5 border-accent/40 shadow-accent/10"
              )}>
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                {type === 'group' ? <Users className="w-10 h-10 text-primary animate-pulse" /> : <Radio className="w-10 h-10 text-accent animate-pulse" />}
              </div>
            </div>
            
            <div className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-primary/60 ml-2 tracking-widest">Название</label>
                <Input 
                  placeholder={type === 'group' ? 'Название группы' : 'Название канала'} 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="h-14 bg-white/5 border-white/10 rounded-2xl text-lg font-black italic tracking-tight focus:border-primary/50 transition-all placeholder:text-white/10 border-2"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-primary/60 ml-2 tracking-widest">Идентификатор узла</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black">@</span>
                  <Input 
                    placeholder="unique_id" 
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="h-14 bg-white/5 border-white/10 rounded-2xl pl-9 font-mono text-sm tracking-widest focus:border-primary/50 transition-all placeholder:text-white/10 border-2"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6 pb-4">
              <Button variant="ghost" className="flex-1 rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest text-muted-foreground/60 hover:text-white transition-all" onClick={() => setStep('select')}>
                Отмена
              </Button>
              <Button 
                className={cn(
                  "flex-1 rounded-2xl h-14 shadow-2xl font-black uppercase italic tracking-widest transition-all hover:scale-105 active:scale-95 group relative overflow-hidden",
                  type === 'group' ? "bg-primary text-white shadow-primary/30" : "bg-accent text-black shadow-accent/30"
                )} 
                onClick={createGroupOrChannel}
                disabled={isLoading}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                  <span className="flex items-center gap-2 relative z-10">
                    Инициализировать <Zap className="w-4 h-4 fill-current" />
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
