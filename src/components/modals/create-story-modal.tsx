
"use client"

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Send, X, Loader2, Image as ImageIcon, Zap } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { compressImage } from '@/lib/utils';
import { addHours } from 'date-fns';

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

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
      setType(file.type.startsWith('video') ? 'video' : 'image');
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    if (!db || !user || !preview) return;
    setIsLoading(true);
    try {
      let content = preview;
      if (type === 'image') {
        content = await compressImage(preview, 1080, 0.5);
      }

      await addDoc(collection(db, 'stories'), {
        userId: user.uid,
        content,
        contentType: type,
        caption: caption.trim(),
        createdAt: new Date().toISOString(),
        expiresAt: addHours(new Date(), 24).toISOString(),
        viewers: []
      });

      toast({ title: "Момент опубликован!", className: "bg-primary text-white" });
      setPreview(null);
      setCaption('');
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0a0a0c] border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl h-[80vh] flex flex-col">
        <DialogHeader className="p-6 border-b border-white/5 shrink-0">
          <DialogTitle className="text-xl font-black uppercase italic text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" /> Новый Момент
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Поделитесь событием на 24 часа
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 relative flex flex-col p-6 items-center justify-center bg-white/[0.02]">
          {preview ? (
            <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl border border-white/10 group">
              {type === 'video' ? (
                <video src={preview} className="w-full h-full object-cover" autoPlay muted loop />
              ) : (
                <img src={preview} className="w-full h-full object-cover" />
              )}
              <Button 
                variant="destructive" 
                size="icon" 
                className="absolute top-4 right-4 rounded-full bg-black/60 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setPreview(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-full rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-4 hover:bg-white/5 transition-all group"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Загрузить медиа</p>
                <p className="text-[8px] font-bold uppercase text-muted-foreground mt-1">Фото или Видео</p>
              </div>
            </button>
          )}
          <input type="file" ref={fileInputRef} hidden accept="image/*,video/*" onChange={handleFile} />
        </div>

        <div className="p-6 space-y-4">
          <Input 
            placeholder="Добавить подпись..." 
            value={caption} 
            onChange={e => setCaption(e.target.value)}
            className="bg-white/5 border-white/5 h-12 rounded-2xl text-center"
          />
          <Button 
            className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-primary/20 disabled:opacity-50"
            onClick={handleCreate}
            disabled={!preview || isLoading}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5 mr-2" /> Опубликовать</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
