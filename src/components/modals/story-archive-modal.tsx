"use client"

import React, { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUser, useFirestore } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { collection, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Archive, Zap, Loader2, Play, RefreshCcw } from 'lucide-react';
import type { Story } from '@/lib/types';
import { useAppState } from '@/lib/app-state';
import { useToast } from '@/hooks/use-toast';
import { addHours } from 'date-fns';

/**
 * STORY ARCHIVE MODAL V72.1 «STABILITY PATCH»
 * ИСПРАВЛЕНО: Прямые импорты хуков для устранения ошибки 'is not a function'.
 */
export function StoryArchiveModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { setStoriesToView } = useAppState();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const archiveQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    // Используем фиксированную дату для запроса архива (все что истекло)
    const now = new Date().toISOString();
    return query(
      collection(db, 'stories'),
      where('userId', '==', user.uid),
      where('expiresAt', '<=', now),
      orderBy('expiresAt', 'desc')
    );
  }, [db, user?.uid]);

  const { data: archivedStories, isLoading } = useCollection<Story>(archiveQuery);

  const handleResonate = async (story: Story) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'stories', story.id), {
        expiresAt: addHours(new Date(), 24).toISOString(),
        createdAt: new Date().toISOString()
      });
      toast({ title: "Момент восстановлен", description: "Он снова в сети на 24 часа." });
    } catch (e) { 
      toast({ title: "Сбой резонанса", variant: "destructive" }); 
    }
  };

  if (!mounted) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#0a0a0c] border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl h-[85vh] flex flex-col outline-none">
        <DialogHeader className="p-8 border-b border-white/5 bg-gradient-to-r from-primary/10 to-transparent">
          <DialogTitle className="text-2xl font-black uppercase italic text-white flex items-center gap-3">
            <Archive className="w-7 h-7 text-primary" /> Архив Моментов
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mt-1">
            Ваши сигналы, ушедшие в историю
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40 py-20">
               <Loader2 className="w-10 h-10 animate-spin text-primary" />
               <p className="text-[10px] font-black uppercase tracking-widest">Синхронизация архива...</p>
            </div>
          ) : archivedStories && archivedStories.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-20">
               {archivedStories.map(story => (
                 <div key={story.id} className="group relative aspect-[3/4] rounded-[1.8rem] overflow-hidden border border-white/5 bg-white/5 shadow-xl hover:scale-[1.02] transition-all">
                    {story.contentType === 'video' ? (
                      <video src={story.content} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" muted />
                    ) : (
                      <img src={story.content} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="Archived" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                       <div className="flex gap-2">
                          <Button 
                            onClick={() => setStoriesToView([story])}
                            variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20"
                          >
                            <Play className="w-4 h-4 fill-current" />
                          </Button>
                          <Button 
                            onClick={() => handleResonate(story)}
                            className="flex-1 h-10 rounded-2xl bg-primary text-white font-black uppercase text-[8px] tracking-widest gap-2 shadow-lg"
                          >
                            <RefreshCcw className="w-3 h-3" /> Восстановить
                          </Button>
                       </div>
                    </div>
                    {story.contentType === 'video' && <Zap className="absolute top-4 left-4 w-4 h-4 text-primary fill-current" />}
                 </div>
               ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 opacity-10 space-y-6">
               <Archive className="w-24 h-24" />
               <p className="text-[12px] font-black uppercase tracking-[0.5em]">Архив пуст</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
