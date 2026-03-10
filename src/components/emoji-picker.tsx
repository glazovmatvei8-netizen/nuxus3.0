
"use client"

import React, { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const EMOJI_DATA = [
  { category: 'Недавние', emojis: [] },
  { category: 'Смайлы', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖'] },
  { category: 'Жесты', emojis: ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦵', '🦿', '🦶'] },
  { category: 'Сердца', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'] },
  { category: 'Животные', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷', '🕸', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🦣', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿', '🦔'] }
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  className?: string;
}

export function EmojiPicker({ onSelect, className }: EmojiPickerProps) {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('nuxus_recent_emojis');
    if (saved) setRecent(JSON.parse(saved));
  }, []);

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    const newRecent = [emoji, ...recent.filter(e => e !== emoji)].slice(0, 32);
    setRecent(newRecent);
    localStorage.setItem('nuxus_recent_emojis', JSON.stringify(newRecent));
  };

  return (
    <div className={cn("bg-[#1c1c1e] border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col", className)}>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {recent.length > 0 && (
            <div>
              <h3 className="text-[10px] font-black uppercase text-muted-foreground/60 mb-2 tracking-widest">Недавние</h3>
              <div className="grid grid-cols-8 gap-2">
                {recent.map((emoji, i) => (
                  <button key={`recent-${i}`} onClick={() => handleSelect(emoji)} className="text-2xl hover:scale-125 active:scale-90 transition-transform">{emoji}</button>
                ))}
              </div>
            </div>
          )}
          
          {EMOJI_DATA.filter(c => c.emojis.length > 0).map((cat, i) => (
            <div key={i}>
              <h3 className="text-[10px] font-black uppercase text-muted-foreground/60 mb-2 tracking-widest">{cat.category}</h3>
              <div className="grid grid-cols-8 gap-2">
                {cat.emojis.map((emoji, j) => (
                  <button key={j} onClick={() => handleSelect(emoji)} className="text-2xl hover:scale-125 active:scale-90 transition-transform">{emoji}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
