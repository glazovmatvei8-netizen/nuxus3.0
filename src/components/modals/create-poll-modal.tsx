
"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { BarChart3, Plus, X, ListTodo, Loader2 } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase/provider';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

/**
 * CREATE POLL MODAL V5.2.0
 * FIXED: Direct imports from provider.
 */
export function CreatePollModal({ open, onOpenChange, chatId }: { open: boolean, onOpenChange: (o: boolean) => void, chatId: string }) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isMultiple, setIsMultiple] = useState(false);

  const handleAddOption = () => {
    if (options.length < 10) setOptions([...options, '']);
  };

  const handleRemoveOption = (idx: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  };

  const handleCreate = async () => {
    if (!question.trim() || options.some(o => !o.trim()) || !db || !user) {
      toast({ title: "Заполните все поля", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const pollData = {
        question: question.trim(),
        options: options.map((o, idx) => ({ id: `opt_${idx}`, text: o.trim(), votes: [] })),
        isAnonymous,
        isMultiple,
      };

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        chatId,
        senderId: user.uid,
        senderName: user.displayName || 'User',
        contentType: 'poll',
        content: `Опрос: ${question.trim()}`,
        sentAt: new Date().toISOString(),
        pollData,
        isRead: false
      });

      await updateDoc(doc(db, 'chats', chatId), { lastMessageAt: new Date().toISOString() });
      
      onOpenChange(false);
      setQuestion('');
      setOptions(['', '']);
      toast({ title: "Опрос создан" });
    } catch (e: any) {
      console.error("Create poll error in create-poll-modal:", e);
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border rounded-[2.5rem] p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase italic text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> Создать опрос
          </DialogTitle>
          <DialogDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">
            Настройте параметры голосования
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Вопрос</Label>
            <Input 
              placeholder="О чем хотите спросить?" 
              value={question} 
              onChange={e => setQuestion(e.target.value)}
              className="bg-muted/30 border-white/5 h-12 rounded-2xl"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Варианты ответа</Label>
            {options.map((opt, idx) => (
              <div key={idx} className="flex gap-2">
                <Input 
                  placeholder={`Вариант ${idx + 1}`} 
                  value={opt} 
                  onChange={e => {
                    const newOpts = [...options];
                    newOpts[idx] = e.target.value;
                    setOptions(newOpts);
                  }}
                  className="bg-muted/30 border-white/5 h-11 rounded-xl"
                />
                {options.length > 2 && (
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveOption(idx)} className="h-11 w-11 rounded-xl text-muted-foreground hover:text-destructive">
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <Button variant="outline" onClick={handleAddOption} className="w-full h-11 border-dashed border-primary/20 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-primary/10">
                <Plus className="w-4 h-4 mr-2" /> Добавить вариант
              </Button>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">Анонимное голосование</span>
                <span className="text-[9px] text-muted-foreground uppercase">Скрыть список проголосовавших</span>
              </div>
              <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">Выбор нескольких</span>
                <span className="text-[9px] text-muted-foreground uppercase">Позволить выбирать несколько опций</span>
              </div>
              <Switch checked={isMultiple} onCheckedChange={setIsMultiple} />
            </div>
          </div>

          <Button 
            className="w-full h-14 rounded-2xl font-black uppercase italic tracking-widest bg-primary shadow-xl shadow-primary/20 mt-4" 
            onClick={handleCreate}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "Создать опрос"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
