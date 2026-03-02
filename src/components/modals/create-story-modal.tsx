
"use client"

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc } from 'firebase/firestore';
import { X, Send, Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';

export function CreateStoryModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [content, setContent] = useState<string | null>(null);
  const [contentType, setContentType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userProfileRef);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const type = file.type.startsWith('video') ? 'video' : 'image';
    setContentType(type);
    
    const reader = new FileReader();
    reader.onloadend = () => setContent(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handlePost = async () => {
    if (!content || !db || !user) return;
    setIsLoading(true);
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours later

      await addDoc(collection(db, 'users', user.uid, 'stories'), {
        userId: user.uid,
        userName: profile?.name || 'Пользователь',
        userAvatar: profile?.avatarUrl || null,
        content,
        contentType,
        caption: caption.trim(),
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        views: [],
        likes: []
      });

      toast({ title: "История опубликована!" });
      setContent(null);
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
      <DialogContent className="max-w-md p-0 overflow-hidden bg-card border-white/5 rounded-[2.5rem]">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Загрузить момент
          </DialogTitle>
          <DialogDescription>
            Поделитесь фото или видео на 24 часа
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {!content ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-[9/16] bg-muted/20 border-2 border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-muted/30 hover:border-primary/40 transition-all group"
            >
              <div className="bg-primary/10 p-4 rounded-full group-hover:scale-110 transition-transform">
                <ImageIcon className="w-10 h-10 text-primary" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground text-center px-4">
                Нажмите для выбора из галереи
              </span>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
            </div>
          ) : (
            <div className="relative aspect-[9/16] bg-black rounded-[2rem] overflow-hidden border border-white/10 group">
              {contentType === 'image' ? (
                <img src={content} className="w-full h-full object-cover" />
              ) : (
                <video src={content} className="w-full h-full object-cover" autoPlay loop muted />
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-md"
                onClick={() => setContent(null)}
              >
                <X className="w-5 h-5" />
              </Button>
              
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <Input 
                  placeholder="Добавьте подпись..." 
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  className="bg-white/10 border-white/10 h-12 rounded-xl text-white placeholder:text-white/40 focus:bg-white/20 transition-all"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1 rounded-xl h-12" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button 
              className="flex-1 rounded-xl h-12 font-bold bg-primary shadow-xl shadow-primary/20"
              disabled={!content || isLoading}
              onClick={handlePost}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Опубликовать <Send className="w-4 h-4 ml-2" /></>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
