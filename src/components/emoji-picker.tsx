
"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Smile, Ghost, Star, Zap, LayoutGrid, Heart, Coffee, Bike, Camera, MapPin, Flag } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { doc, collection, query, where } from 'firebase/firestore';
import type { User, StickerPack } from '@/lib/types';

/**
 * EMOJI PICKER V120.0 «CLEAN GRID»
 * FIXED: Artifacts and sizing for stickers.
 */

const EMOJI_CATEGORIES = [
  { id: 'smiles', label: 'Смайлы', icon: Smile, emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖'] },
  { id: 'gestures', label: 'Жесты', icon: LayoutGrid, emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾'] },
  { id: 'animals', label: 'Природа', icon: Ghost, emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🦋', '🐌', '🐞', '🐜', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🐙', '🦑', '🦐', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐘', '🦛', '🦒', '🦘', '🐒', '🦍', '🦧', '🐾'] },
  { id: 'food', label: 'Еда', icon: Coffee, emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌽', '🥕', '🥔', '🍠', '🥐', '🥖', '🥨', '🧀', '🥚', '🍳', '🥞', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🌮', '🌯', '🥗', '🥘', '🍲', '🍜', '🍝', '🍣', '🍱', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🍵', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🥤', '🧊'] },
  { id: 'activity', label: 'Активность', icon: Bike, emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🎿', '⛷️', '🏂', '🏋️', '🤺', '🤼', '🤸', '⛹️', '⛹️‍♂️', '⛹️‍♀️', '🤾', '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🎟️', '🎫', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '🧩', '♟️', '🎯', '🎳', '🎮', '🎰', '👾'] },
  { id: 'travel', label: 'Транспорт', icon: MapPin, emojis: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🚲', '🛴', '🛵', '🏍️', '🛺', '🚂', '🚆', '🚄', '🔥', '✈️', '🛫', '🛬', '🪂', '🚁', '🛰️', '🚀', '🛸', '⛵', '🛶', '🚤', '🚢', '⚓', '⛽', '🚧', '🚦', '🚥', '🛑', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏬', '🏭', '🏗️', '⛪', '🕌', '🕍', '🕋', '⛩️', '🌃', '🏙️', '🌇', '🌅', '🌠', '🌌', '🌉', '🌁'] },
  { id: 'objects', label: 'Предметы', icon: Camera, emojis: ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🗑️', '🛢️', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🪛', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🪚', '🔩', '⚙️', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩺', '🩹', '💊', '💉', '🩸', '🧬', '🦠', '🧼', '🧹', '🧺', '🧻', '🚽', '🚿', '🛀', '🛁', '🧴'] },
  { id: 'symbols', label: 'Символы', icon: Heart, emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗️', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🛗', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '▶️', '⏸️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '🔄', '🔃'] },
  { id: 'flags', label: 'Флаги', icon: Flag, emojis: ['🏳️', '🏴', '🏁', '🚩', '🏳️‍🌈', '🏴‍☠️', '🇦🇫', '🇦🇱', '🇩🇿', '🇦🇸', '🇦🇩', '🇦🇴', '🇦🇷', '🇦🇲', '🇦🇺', '🇦🇹', '🇦🇿', '🇧🇸', '🇧🇭', '🇧🇩', '🇧🇧', '🇧🇾', '🇧🇪', '🇧🇿', '🇧🇯', '🇧🇲', '🇧🇹', '🇧🇴', '🇧🇦', '🇧🇼', '🇧🇷', '🇧🇳', '🇧🇬', '🇰🇭', '🇨🇲', '🇨🇦', '🇮🇨', '🇨🇻', '🇨🇱', '🇨🇳', '🇨🇴', '🇰🇲', '🇨🇬', '🇨🇷', '🇭🇷', '🇨🇺', '🇨🇾', '🇨🇿', '🇩🇰', '🇩🇯', '🇩🇴', '🇪🇨', '🇪🇬', '🇸🇻', '🇪🇪', '🇪🇹', '🇪🇺', '🇫🇯', '🇫🇮', '🇫🇷', '🇬🇦', '🇬🇲', '🇬🇪', '🇩🇪', '🇬🇭', '🇬🇷', '🇬🇱', '🇬🇹', '🇬🇳', '🇬🇾', '🇭🇹', '🇭🇰', '🇭🇺', '🇮🇸', '🇮🇳', '🇮🇩', '🇮🇷', '🇮🇶', '🇮🇪', '🇮🇱', '🇮🇹', '🇯🇲', '🇯🇵', '🇯🇴', '🇰🇿', '🇰🇪', '🇰🇮', '🇰🇼', '🇰🇬', '🇱🇦', '🇱🇻', '🇱🇧', '🇱🇸', '🇱🇷', '🇱🇾', '🇱🇮', '🇱🇹', '🇱🇺', '🇲🇴', '🇲🇰', '🇲🇬', '🇲🇾', '🇲🇻', '🇲🇱', '🇲🇹', '🇲🇽', '🇲🇩', '🇲🇨', '🇲🇳', '🇲🇪', '🇲🇦', '🇲🇿', '🇲🇲', '🇳🇦', '🇳🇵', '🇳🇱', '🇳🇿', '🇳🇮', '🇳🇪', '🇳🇬', '🇰🇵', '🇳🇴', '🇴🇲', '🇵🇰', '🇵🇼', '🇵🇸', '🇵🇦', '🇵🇬', '🇵🇾', '🇵🇪', '🇵🇭', '🇵🇱', '🇵🇹', '🇵🇷', '🇶🇦', '🇷🇴', '🇷🇺', '🇷🇼', '🇼🇸', '🇸🇦', '🇸🇳', '🇷🇸', '🇸🇨', '🇸🇬', '🇸🇰', '🇸🇮', '🇿🇦', '🇰🇷', '🇪🇸', '🇱🇰', '🇸🇪', '🇨🇭', '🇸🇾', '🇹🇼', '🇹🇯', '🇹🇿', '🇹🇭', '🇹🇱', '🇹🇬', '🇹🇷', '🇹🇲', '🇺🇦', '🇦🇪', '🇬🇧', '🇺🇸', '🇺🇾', '🇺🇿', '🇻🇦', '🇻🇪', '🇻🇳', '🇾🇪', '🇿🇲', '🇿🇼'] }
];

const DEFAULT_STICKERS = [
  'https://picsum.photos/seed/nx_st1/400/400',
  'https://picsum.photos/seed/nx_st2/400/400',
  'https://picsum.photos/seed/nx_st3/400/400',
  'https://picsum.photos/seed/nx_st4/400/400',
  'https://picsum.photos/seed/nx_st5/400/400',
  'https://picsum.photos/seed/nx_st6/400/400',
  'https://picsum.photos/seed/nx_st7/400/400',
  'https://picsum.photos/seed/nx_st8/400/400',
  'https://picsum.photos/seed/nx_st9/400/400',
  'https://picsum.photos/seed/nx_st10/400/400',
  'https://picsum.photos/seed/nx_st11/400/400',
  'https://picsum.photos/seed/nx_st12/400/400'
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
  const [activeEmojiCategory, setActiveEmojiCategory] = useState('smiles');

  const userRef = useMemo(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile } = useDoc<User>(userRef);

  const packsQuery = useMemo(() => {
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
    <div className={cn("bg-[#1c1c1e]/98 backdrop-blur-[20px] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col h-[480px] animate-in slide-in-from-bottom-4 duration-500 z-[1000]", className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid grid-cols-2 h-14 bg-white/5 border-b border-white/5 shrink-0 rounded-none p-1 gap-1">
          <TabsTrigger value="emoji" className="h-full rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-white gap-2 transition-all font-black uppercase text-[10px] tracking-widest">
            <Smile className="w-4 h-4" /> Эмодзи
          </TabsTrigger>
          <TabsTrigger value="stickers" className="h-full rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-white gap-2 transition-all font-black uppercase text-[10px] tracking-widest">
            <Zap className="w-4 h-4" /> Стикеры
          </TabsTrigger>
        </TabsList>

        <TabsContent value="emoji" className="flex-1 min-h-0 m-0 outline-none flex flex-col">
          <div className="flex gap-1 p-2 bg-white/5 border-b border-white/5 overflow-x-auto scrollbar-hide shrink-0">
             {EMOJI_CATEGORIES.map(cat => (
               <button 
                 key={cat.id} 
                 onClick={() => setActiveEmojiCategory(cat.id)}
                 className={cn(
                   "h-9 min-w-[36px] rounded-lg flex items-center justify-center transition-all",
                   activeEmojiCategory === cat.id ? "bg-primary/20 text-primary" : "text-white/20 hover:text-white/40"
                 )}
               >
                 <cat.icon className="w-4 h-4" />
               </button>
             ))}
          </div>

          <ScrollArea className="flex-1">
            <div className="p-5 space-y-8">
              {recent.length > 0 && activeEmojiCategory === 'smiles' && (
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
              
              {EMOJI_CATEGORIES.map((cat) => (activeEmojiCategory === cat.id || activeEmojiCategory === 'all') && (
                <div key={cat.id}>
                  <h3 className="text-[9px] font-black uppercase text-white/20 mb-4 tracking-[0.3em] px-1">{cat.label}</h3>
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
              className={cn("h-11 min-w-[44px] rounded-xl flex items-center justify-center border transition-all", activePackId === 'default' ? "bg-primary border-primary" : "bg-black/40 border-white/10 opacity-60")}
            >
              <Zap className="w-5 h-5 text-white" />
            </button>
            {stickerPacks?.map(pack => (
              <button 
                key={pack.id} 
                onClick={() => setActivePackId(pack.id)}
                className={cn("h-11 min-w-[44px] rounded-xl overflow-hidden border transition-all", activePackId === pack.id ? "border-primary scale-110 shadow-lg" : "border-white/10 opacity-40")}
              >
                {pack.iconUrl ? <img src={pack.iconUrl} className="w-full h-full object-cover" alt="Pack" crossOrigin="anonymous" /> : <div className="w-full h-full bg-primary/20 flex items-center justify-center text-[10px] text-primary">{pack.name[0]}</div>}
              </button>
            ))}
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4">
              <div className="grid grid-cols-4 gap-3">
                {displayedStickers.map((url, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => onStickerSelect(url)}
                    className="aspect-square rounded-2xl overflow-hidden hover:bg-white/5 active:scale-95 transition-all p-1.5 flex items-center justify-center bg-white/[0.03] border border-white/[0.05]"
                  >
                    <img 
                      src={url} 
                      alt="Sticker" 
                      className="w-full h-full object-contain" 
                      loading="lazy"
                      crossOrigin="anonymous"
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
