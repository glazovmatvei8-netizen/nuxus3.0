
"use client"

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Send, Image as ImageIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface ImagePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: { url: string; type: 'image' | 'video' }[];
  onRemove: (index: number) => void;
  onSend: () => void;
  isSending: boolean;
}

export function ImagePreviewModal({ open, onOpenChange, files, onRemove, onSend, isSending }: ImagePreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#0a0a0c] border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl flex flex-col h-[85vh]">
        <DialogHeader className="p-6 border-b border-white/5 shrink-0">
          <DialogTitle className="text-xl font-black uppercase italic text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" /> Подготовка к отправке
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Проверьте файлы перед загрузкой в Ядро
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {files.map((file, idx) => (
              <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-white/5 group bg-white/5">
                {file.type === 'video' ? (
                  <video src={file.url} className="w-full h-full object-cover" />
                ) : (
                  <div className="relative w-full h-full">
                    <Image src={file.url} alt="Preview" fill className="object-cover" unoptimized />
                  </div>
                )}
                <button 
                  onClick={() => onRemove(idx)}
                  className="absolute top-2 right-2 bg-black/60 backdrop-blur-md p-1.5 rounded-full text-white hover:bg-red-500 transition-colors z-10 border border-white/10 shadow-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t border-white/5 bg-white/5 flex gap-3 sm:justify-between items-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Выбрано: {files.length} / 30
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest h-12 px-6">Отмена</Button>
            <Button 
              onClick={onSend} 
              disabled={isSending || files.length === 0}
              className="h-12 bg-primary hover:bg-primary/90 rounded-xl font-black uppercase tracking-widest px-8 shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              {isSending ? <Loader2 className="animate-spin w-4 h-4" /> : <><Send className="w-4 h-4 mr-2" /> Отправить</>}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
