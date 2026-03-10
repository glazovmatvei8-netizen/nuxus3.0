
"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Smile, Sticker, Ghost, Star, Plus } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import type { User, StickerPack } from '@/lib/types';

const EMOJI_DATA = [
  { category: 'Смайлы', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖'] },
  { category: 'Жесты', emojis: ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦵', '🦿', '🦶'] },
  { category: 'Сердца', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'] },
  { category: 'Животные', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷', '🕸', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🦣', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍', '🐈', '🐈‍⬛', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿', '🦔'] }
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
  const [activePackId, setActivePackId] = useState<string | 'custom'>('custom');

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
    const newRecent = [emoji, ...recent.filter(e => e !== emoji)].slice(0, 32);
    setRecent(newRecent);
    localStorage.setItem('nuxus_recent_emojis', JSON.stringify(newRecent));
  };

  const displayedStickers = useMemo(() => {
    if (activePackId === 'custom') return profile?.settings?.stickers || [];
    const pack = stickerPacks?.find(p => p.id === activePackId);
    return pack?.stickerUrls || [];
  }, [activePackId, profile?.settings?.stickers, stickerPacks]);

  return (
    <div className={cn("bg-[#1c1c1e]/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col h-full", className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid grid-cols-2 h-12 bg-white/5 border-b border-white/5 shrink-0 rounded-none p-0">
          <TabsTrigger value="emoji" className="h-full rounded-none data-[state=active]:bg-white/10 data-[state=active]:text-primary gap-2">
            <Smile className="w-4 h-4" /> <span className="text-[10px] font-black uppercase tracking-widest">Эмодзи</span>
          </TabsTrigger>
          <TabsTrigger value="stickers" className="h-full rounded-none data-[state=active]:bg-white/10 data-[state=active]:text-primary gap-2">
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
          {/* Packs Selector */}
          <div className="flex gap-2 p-2 bg-white/5 border-b border-white/5 overflow-x-auto scrollbar-hide shrink-0">
            <button 
              onClick={() => setActivePackId('custom')}
              className={cn("h-8 min-w-[32px] rounded-lg flex items-center justify-center border border-white/10 transition-all", activePackId === 'custom' ? "bg-primary border-primary" : "bg-black/20")}
            >
              <Star className={cn("w-4 h-4", activePackId === 'custom' ? "text-white" : "text-muted-foreground")} />
            </button>
            {stickerPacks?.map(pack => (
              <button 
                key={pack.id} 
                onClick={() => setActivePackId(pack.id)}
                className={cn("h-8 min-w-[32px] rounded-lg overflow-hidden border border-white/10 transition-all", activePackId === pack.id ? "border-primary scale-110" : "opacity-60")}
              >
                {pack.iconUrl ? <img src={pack.iconUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">{pack.name[0]}</div>}
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
                <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center space-y-4">
                  <Ghost className="w-12 h-12" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white">Нет стикеров</p>
                    <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Напишите @stickers,<br />чтобы создать свои!</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
