
"use client"

import React, { useState, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Send, X, Loader2, Zap, FileUp, ShieldAlert } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase/provider';
import { collection, addDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { compressImage, isUserPremium } from '@/lib/utils';
import { addHours } from 'date-fns';
import type { User } from '@/lib/types';

/**
 * CREATE STORY MODAL V5.2.0
 * FIXED: Direct imports from provider.
 */
export function CreateStoryModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);

  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [type, setType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('');

  const isPremium = useMemo(() => isUserPremium(profile), [profile]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isPremium) {
      toast({ title: "Доступ ограничен", description: "Нужен Premium статус", variant: "destructive" });
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    const limit = 100 * 1024 * 1024;
    if (file.size > limit) {
      toast({ title: "Файл слишком большой", description: "Лимит Ядра — 100МБ", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    setIsLoading(true);
    reader.onloadend = () => {
      setPreview(reader.result as string);
      setType(file.type.startsWith('video') ? 'video' : 'image');
      setIsLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    if (!db || !user || !preview || isPublishing) return;
    
    if (!isPremium) {
      toast({ title: "Ошибка прав", description: "Требуется Premium статус", variant: "destructive" });
      return;
    }

    setIsPublishing(true);
    try {
      let finalContent = preview;
      if (type === 'image') {
        finalContent = await compressImage(preview, 1200, 0.7);
      }

      await addDoc(collection(db, 'stories'), {
        userId: user.uid,
        content: finalContent,
        contentType: type,
        caption: caption.trim(),
        createdAt: new Date().toISOString(),
        expiresAt: addHours(new Date(), 24).toISOString(),
        viewers: [],
        reactions: {}
      });

      toast({ title: "Момент опубликован!" });
      setPreview(null);
      setCaption('');
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Ошибка Ядра", description: "Попробуйте снова", variant: "destructive" });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if(!isPublishing) onOpenChange(o); }}>
      <DialogContent className="max-w-md bg-[#0a0a0c] border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl h-[85vh] flex flex-col outline-none">
        <DialogHeader className="p-6 border-b border-white/5 shrink-0 bg-[#0a0a0c]">
          <DialogTitle className="text-xl font-black uppercase italic text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" /> Новый Момент
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            {isPremium ? 'HQ Медиа пакет до 100МБ' : 'Требуется статус Premium'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 relative flex flex-col p-4 items-center justify-center bg-white/[0.02] min-h-0 overflow-y-auto">
          {!isPremium ? (
            <div className="flex flex-col items-center gap-6 text-center px-8">
              <div className="w-20 h-20 rounded-[2rem] bg-primary/10 flex items-center justify-center">
                <ShieldAlert className="w-10 h-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black uppercase italic text-white">Доступ заблокирован</h3>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest leading-relaxed">
                  Публикация Моментов доступна только узлам с активным Premium статусом.
                </p>
              </div>
            </div>
          ) : (isLoading || isPublishing) && !preview ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest">Шифрование пакета...</p>
            </div>
          ) : preview ? (
            <div className="relative w-full aspect-[3/4] max-h-[50vh] rounded-3xl overflow-hidden shadow-2xl border border-white/10 group">
              {type === 'video' ? (
                <video src={preview} className="w-full h-full object-cover" autoPlay muted loop playsInline />
              ) : (
                <img src={preview} className="w-full h-full object-cover" alt="Preview" />
              )}
              {!isPublishing && (
                <Button variant="destructive" size="icon" className="absolute top-4 right-4 rounded-full bg-black/60" onClick={() => setPreview(null)}><X className="w-4 h-4" /></Button>
              )}
              {isPublishing && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()} className="w-full h-64 rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-4 hover:bg-white/5 transition-all">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <FileUp className="w-8 h-8 text-primary" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Выбрать файл (HQ)</p>
            </button>
          )}
          <input type="file" ref={fileInputRef} hidden accept="image/*,video/*" onChange={handleFile} />
        </div>

        <div className="p-6 pb-10 space-y-4 bg-[#0a0a0c] border-t border-white/5 shrink-0">
          <Input 
            placeholder="Добавить подпись к моменту..." 
            value={caption} 
            onChange={e => setCaption(e.target.value)} 
            disabled={isPublishing || !isPremium} 
            className="bg-white/5 border-white/5 h-12 rounded-2xl text-center" 
          />
          <Button 
            className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-primary/20"
            onClick={handleCreate}
            disabled={!preview || isPublishing || !isPremium}
          >
            {isPublishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5 mr-2" /> Опубликовать</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
