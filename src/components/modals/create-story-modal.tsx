
"use client"

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Send, X, Loader2, Zap } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { compressImage } from '@/lib/utils';
import { addHours } from 'date-fns';

/**
 * FIX: Исправлена логика публикации (handleCreate) и визуальная индикация.
 */
export function CreateStoryModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [type, setType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Ограничение размера для веб-версии
    if (file.size > 15 * 1024 * 1024) {
      toast({ title: "Файл слишком большой", description: "Лимит Ядра для моментов — 15МБ", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onloadstart = () => setIsLoading(true);
    reader.onloadend = () => {
      setPreview(reader.result as string);
      setType(file.type.startsWith('video') ? 'video' : 'image');
      setIsLoading(false);
    };
    reader.onerror = () => {
      toast({ title: "Ошибка чтения файла", variant: "destructive" });
      setIsLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    if (!db || !user || !preview) return;
    
    setIsLoading(true);
    try {
      let finalContent = preview;
      if (type === 'image') {
        // Агрессивное сжатие для быстрой передачи по сети
        finalContent = await compressImage(preview, 1080, 0.5);
      }

      const storyData = {
        userId: user.uid,
        content: finalContent,
        contentType: type,
        caption: caption.trim(),
        createdAt: new Date().toISOString(),
        expiresAt: addHours(new Date(), 24).toISOString(),
        viewers: [],
        reactions: {}
      };

      // Неблокирующая отправка для лучшего UX
      await addDoc(collection(db, 'stories'), storyData);

      toast({ title: "Момент опубликован!", className: "bg-primary text-white" });
      
      // Сброс состояния
      setPreview(null);
      setCaption('');
      setIsLoading(false);
      onOpenChange(false);
    } catch (e: any) {
      console.error("Story Post Error:", e);
      toast({ title: "Ошибка Ядра", description: "Не удалось загрузить сигнал", variant: "destructive" });
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if(!isLoading) onOpenChange(o); }}>
      <DialogContent className="max-w-md bg-[#0a0a0c] border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl h-[85vh] flex flex-col outline-none">
        <DialogHeader className="p-6 border-b border-white/5 shrink-0 bg-[#0a0a0c]">
          <DialogTitle className="text-xl font-black uppercase italic text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" /> Новый Момент
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Поделитесь событием на 24 часа
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 relative flex flex-col p-4 items-center justify-center bg-white/[0.02] min-h-0 overflow-hidden overflow-y-auto">
          {isLoading && !preview ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Обработка...</p>
            </div>
          ) : preview ? (
            <div className="relative w-full aspect-[3/4] max-h-[50vh] rounded-3xl overflow-hidden shadow-2xl border border-white/10 group">
              {type === 'video' ? (
                <video src={preview} className="w-full h-full object-cover" autoPlay muted loop playsInline />
              ) : (
                <img src={preview} className="w-full h-full object-cover" alt="Preview" />
              )}
              {!isLoading && (
                <Button 
                  variant="destructive" 
                  size="icon" 
                  className="absolute top-4 right-4 rounded-full bg-black/60 backdrop-blur-md border border-white/10"
                  onClick={() => setPreview(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ) : (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-64 rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-4 hover:bg-white/5 transition-all group"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Загрузить медиа</p>
                <p className="text-[8px] font-bold uppercase text-muted-foreground mt-1">Фото или Видео (до 15МБ)</p>
              </div>
            </button>
          )}
          <input type="file" ref={fileInputRef} hidden accept="image/*,video/*" onChange={handleFile} />
        </div>

        <div className="p-6 pb-10 space-y-4 bg-[#0a0a0c] border-t border-white/5 shrink-0">
          <Input 
            placeholder="Добавить подпись..." 
            value={caption} 
            onChange={e => setCaption(e.target.value)}
            disabled={isLoading}
            className="bg-white/5 border-white/5 h-12 rounded-2xl text-center focus:border-primary/40 transition-colors"
          />
          <Button 
            className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-primary/20 disabled:opacity-50 transition-all active:scale-95"
            onClick={handleCreate}
            disabled={!preview || isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Загрузка...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                <span>Опубликовать</span>
              </div>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
