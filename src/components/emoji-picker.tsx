
"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Smile, Sticker, Ghost, Star, Loader2, Trash2 } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where, updateDoc, arrayRemove } from 'firebase/firestore';
import type { User, StickerPack } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const EMOJI_DATA = [
  { category: 'Популярные', emojis: ['😂', '❤️', '🔥', '👍', '🙏', '😊', '😍', '✨', '😭', '😎', '💀', '🤡', '🤔', '🚀', '💯', '✅'] },
  { category: 'Смайлы', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖'] },
  { category: 'Животные', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🦋', '🐌', '🐞', '🕷', '🦂', '🐢', '🐍', '🦎', '🦖', '🐙', '🦑', '🦐', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐘', '🦛', '🦒', '🦘'] }
];

// Дефолтный пак стикеров Nuxus
const DEFAULT_STICKERS = [
  'https://cdn.pixabay.com/photo/2021/01/22/01/51/shiba-inu-5938950_1280.png',
  'https://cdn.pixabay.com/photo/2020/09/20/17/43/cat-5587841_1280.png',
  'https://cdn.pixabay.com/photo/2020/12/30/14/23/cat-5873539_1280.png',
  'https://cdn.pixabay.com/photo/2019/11/08/11/56/cat-4611189_1280.png',
  'https://cdn.pixabay.com/photo/2017/01/23/18/19/cat-2003362_1280.png',
  'https://cdn.pixabay.com/photo/2016/12/03/17/30/cat-1880193_1280.png'
];

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onStickerSelect: (url: string) => void;
  className?: string;
}

export function EmojiPicker({ onEmojiSelect, onStickerSelect, className }: EmojiPickerProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [recent, setRecent] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('emoji');
  const [activePackId, setActivePackId] = useState<string | 'default'>('default');

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);

  const packsQuery = useMemoFirebase(() => {
    if (!db || !profile?.installedStickerPackIds?.length) return null;
    return query(collection(db, 'stickerPacks'), where('id', 'in', profile.installedStickerPackIds));
  }, [db, profile?.installedStickerPackIds]);

  const { data: stickerPacks, isLoading: isPacksLoading } = useCollection<StickerPack>(packsQuery);

  useEffect(() => {
    const saved = localStorage.getItem('nuxus_recent_emojis');
    if (saved) setRecent(JSON.parse(saved));
  }, []);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    const newRecent = [emoji, ...recent.filter(e => e !== emoji)].slice(0, 16);
    setRecent(newRecent);
    localStorage.setItem('nuxus_recent_emojis', JSON.stringify(newRecent));
  };

  const displayedStickers = useMemo(() => {
    if (activePackId === 'default') return DEFAULT_STICKERS;
    const pack = stickerPacks?.find(p => p.id === activePackId);
    return pack?.stickerUrls || [];
  }, [activePackId, stickerPacks]);

  return (
    <div className={cn("bg-[#1c1c1e]/90 backdrop-blur-3xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col h-[400px]", className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid grid-cols-2 h-12 bg-white/5 border-b border-white/5 shrink-0 rounded-none p-0">
          <TabsTrigger value="emoji" className="h-full rounded-none data-[state=active]:bg-white/10 data-[state=active]:text-primary gap-2 transition-all">
            <Smile className="w-4 h-4" /> <span className="text-[10px] font-black uppercase tracking-widest">Эмодзи</span>
          </TabsTrigger>
          <TabsTrigger value="stickers" className="h-full rounded-none data-[state=active]:bg-white/10 data-[state=active]:text-primary gap-2 transition-all">
            <Sticker className="w-4 h-4" /> <span className="text-[10px] font-black uppercase tracking-widest">Стикеры</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="emoji" className="flex-1 min-h-0 m-0 outline-none">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-6">
              {recent.length > 0 && (
                <div>
                  <h3 className="text-[9px] font-black uppercase text-muted-foreground/40 mb-3 tracking-[0.2em] px-1">Недавние</h3>
                  <div className="grid grid-cols-8 gap-2">
                    {recent.map((emoji, i) => (
                      <button key={`recent-${i}`} onClick={() => handleEmojiClick(emoji)} className="text-2xl hover:scale-125 active:scale-90 transition-transform duration-200">
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {EMOJI_DATA.map((cat, i) => (
                <div key={i}>
                  <h3 className="text-[9px] font-black uppercase text-muted-foreground/40 mb-3 tracking-[0.2em] px-1">{cat.category}</h3>
                  <div className="grid grid-cols-8 gap-2">
                    {cat.emojis.map((emoji, j) => (
                      <button key={j} onClick={() => handleEmojiClick(emoji)} className="text-2xl hover:scale-125 active:scale-90 transition-transform duration-200">
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="stickers" className="flex-1 min-h-0 m-0 outline-none flex flex-col">
          <div className="flex gap-2 p-2 bg-white/5 border-b border-white/5 overflow-x-auto scrollbar-hide shrink-0 items-center">
            <button 
              onClick={() => setActivePackId('default')}
              className={cn("h-10 min-w-[40px] rounded-xl flex items-center justify-center border transition-all", activePackId === 'default' ? "bg-primary border-primary shadow-lg" : "bg-black/40 border-white/10 opacity-60")}
            >
              <Star className="w-4 h-4 text-white" />
            </button>
            {stickerPacks?.map(pack => (
              <button 
                key={pack.id} 
                onClick={() => setActivePackId(pack.id)}
                className={cn("h-10 min-w-[40px] rounded-xl overflow-hidden border transition-all", activePackId === pack.id ? "border-primary scale-105" : "border-white/10 opacity-60")}
              >
                {pack.iconUrl ? <img src={pack.iconUrl} className="w-full h-full object-cover" alt="Pack" /> : <div className="w-full h-full bg-primary/20 flex items-center justify-center text-[10px] text-primary">{pack.name[0]}</div>}
              </button>
            ))}
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4">
              {displayedStickers.length > 0 ? (
                <div className="grid grid-cols-4 gap-3">
                  {displayedStickers.map((url, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => onStickerSelect(url)}
                      className="aspect-square rounded-xl overflow-hidden hover:bg-white/5 active:scale-90 transition-all p-1"
                    >
                      <img src={url} alt="Sticker" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
                  <Ghost className="w-12 h-12 mb-4" />
                  <p className="text-[10px] font-black uppercase">Нет стикеров</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
