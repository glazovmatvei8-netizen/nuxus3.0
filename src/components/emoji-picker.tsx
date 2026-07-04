
"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Smile, Sticker, Ghost, Star, Loader2, Trash2, Zap } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where, updateDoc, arrayRemove } from 'firebase/firestore';
import type { User, StickerPack } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const EMOJI_DATA = [
  { category: 'Популярные', emojis: ['😂', '❤️', '🔥', '👍', '🙏', '😊', '😍', '✨', '😭', '😎', '💀', '🤡', '🤔', '🚀', '💯', '✅'] },
  { category: 'Смайлы', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖'] },
  { category: 'Животные', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🦋', '🐌', '🐞', '🕷', '🦂', '🐢', '🐍', '🦎', '🦖', '🐙', '🦑', '🦐', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐘', '🦛', '🦒', '🦘'] }
];

/**
 * ЭКСКЛЮЗИВНЫЕ СТИКЕРЫ NUXUS (HQ PACK V5)
 * ИСПРАВЛЕНО: Сверхстабильные источники изображений.
 */
const DEFAULT_STICKERS = [
  'https://picsum.photos/seed/nx1/400/400',
  'https://picsum.photos/seed/nx2/400/400',
  'https://picsum.photos/seed/nx3/400/400',
  'https://picsum.photos/seed/nx4/400/400',
  'https://picsum.photos/seed/nx5/400/400',
  'https://picsum.photos/seed/nx6/400/400',
  'https://picsum.photos/seed/nx7/400/400',
  'https://picsum.photos/seed/nx8/400/400',
  'https://picsum.photos/seed/nx9/400/400',
  'https://picsum.photos/seed/nx10/400/400',
  'https://picsum.photos/seed/nx11/400/400',
  'https://picsum.photos/seed/nx12/400/400'
];

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onStickerSelect: (url: string) => void;
  className?: string;
}

export function EmojiPicker({ onEmojiSelect, onStickerSelect, className }: EmojiPickerProps) {
  const { user } = useUser();
  const db = useFirestore();
  const [recent, setRecent] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('emoji');
  const [activePackId, setActivePackId] = useState<string | 'default'>('default');

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);

  const packsQuery = useMemoFirebase(() => {
    if (!db || !profile?.installedStickerPackIds?.length) return null;
    return query(collection(db, 'stickerPacks'), where('id', 'in', profile.installedStickerPackIds));
  }, [db, profile?.installedStickerPackIds]);

  const { data: stickerPacks } = useCollection<StickerPack>(packsQuery);

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
    if (activeTab === 'emoji') return [];
    if (activePackId === 'default') return DEFAULT_STICKERS;
    const pack = stickerPacks?.find(p => p.id === activePackId);
    return pack?.stickerUrls || [];
  }, [activePackId, stickerPacks, activeTab]);

  return (
    <div className={cn("bg-[#1c1c1e]/95 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.8)] flex flex-col h-[420px] animate-in slide-in-from-bottom-4 duration-500 z-[1000]", className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid grid-cols-2 h-14 bg-white/5 border-b border-white/5 shrink-0 rounded-none p-1 gap-1">
          <TabsTrigger value="emoji" className="h-full rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-white gap-2 transition-all font-black uppercase text-[10px] tracking-widest">
            <Smile className="w-4 h-4" /> Эмодзи
          </TabsTrigger>
          <TabsTrigger value="stickers" className="h-full rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-white gap-2 transition-all font-black uppercase text-[10px] tracking-widest">
            <Zap className="w-4 h-4" /> Стикеры
          </TabsTrigger>
        </TabsList>

        <TabsContent value="emoji" className="flex-1 min-h-0 m-0 outline-none">
          <ScrollArea className="h-full">
            <div className="p-5 space-y-8">
              {recent.length > 0 && (
                <div>
                  <h3 className="text-[9px] font-black uppercase text-primary/40 mb-4 tracking-[0.3em] px-1 flex items-center gap-2">
                    <Star className="w-3 h-3 fill-current" /> Недавние
                  </h3>
                  <div className="grid grid-cols-8 gap-3">
                    {recent.map((emoji, i) => (
                      <button key={`recent-${i}`} onClick={() => handleEmojiClick(emoji)} className="text-3xl hover:scale-125 active:scale-90 transition-transform duration-200">
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {EMOJI_DATA.map((cat, i) => (
                <div key={i}>
                  <h3 className="text-[9px] font-black uppercase text-white/20 mb-4 tracking-[0.3em] px-1">{cat.category}</h3>
                  <div className="grid grid-cols-8 gap-3">
                    {cat.emojis.map((emoji, j) => (
                      <button key={j} onClick={() => handleEmojiClick(emoji)} className="text-3xl hover:scale-125 active:scale-90 transition-transform duration-200">
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
          <div className="flex gap-2 p-3 bg-white/5 border-b border-white/5 overflow-x-auto scrollbar-hide shrink-0 items-center">
            <button 
              onClick={() => setActivePackId('default')}
              className={cn("h-11 min-w-[44px] rounded-xl flex items-center justify-center border transition-all", activePackId === 'default' ? "bg-primary border-primary shadow-[0_0_15px_rgba(168,85,247,0.4)]" : "bg-black/40 border-white/10 opacity-60")}
            >
              <Zap className="w-5 h-5 text-white" />
            </button>
            {stickerPacks?.map(pack => (
              <button 
                key={pack.id} 
                onClick={() => setActivePackId(pack.id)}
                className={cn("h-11 min-w-[44px] rounded-xl overflow-hidden border transition-all", activePackId === pack.id ? "border-primary scale-110 shadow-lg" : "border-white/10 opacity-40")}
              >
                {pack.iconUrl ? <img src={pack.iconUrl} className="w-full h-full object-cover" alt="Pack" /> : <div className="w-full h-full bg-primary/20 flex items-center justify-center text-[10px] text-primary">{pack.name[0]}</div>}
              </button>
            ))}
          </div>

          <ScrollArea className="flex-1">
            <div className="p-5">
              <div className="grid grid-cols-4 gap-4">
                {displayedStickers.map((url, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => onStickerSelect(url)}
                    className="aspect-square rounded-[1.5rem] overflow-hidden hover:bg-white/10 active:scale-90 transition-all p-2 bg-white/5 border border-white/5 group shadow-lg flex items-center justify-center relative"
                  >
                    <img 
                      src={url} 
                      alt="Sticker" 
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500 drop-shadow-xl block relative z-10" 
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
