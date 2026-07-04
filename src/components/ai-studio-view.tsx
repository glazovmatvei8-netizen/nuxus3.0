
"use client"

import React, { useState, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Sparkles, Video as MovieIcon, Image as ImageIcon, Wand2, 
  Loader2, Download, Zap, ShieldCheck, Play, Plus, X, Star, FileUp
} from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn, isUserPremium } from '@/lib/utils';
import type { User } from '@/lib/types';
import { generateAiVideo } from '@/ai/flows/generate-ai-video-flow';
import { generateAiImage } from '@/ai/flows/generate-ai-image-flow';

/**
 * NUXUS AI CINEMA STUDIO V1.0
 * Позволяет генерировать видео через Veo 3.0 и изображения через Imagen 4.
 */
export default function AiStudioView() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);
  const isPremium = isUserPremium(profile);

  const [activeTab, setActiveTab] = useState<'video' | 'image'>('video');
  const [prompt, setPrompt] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [generationLog, setGenerationLog] = useState<string[]>([]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const addLog = (msg: string) => setGenerationLog(prev => [...prev.slice(-4), msg]);

  const handleGenerate = async () => {
    if (!isPremium) {
      toast({ title: "Elite Access Only", description: "Функция доступна только для Premium-узлов.", variant: "destructive" });
      return;
    }
    if (!prompt.trim() && !photoPreview) {
      toast({ title: "Пустой сигнал", description: "Введите описание или загрузите фото.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setResultUrl(null);
    setGenerationLog(["Инициализация квантового потока..."]);

    try {
      if (activeTab === 'video') {
        if (!photoPreview) {
          toast({ title: "Нужно фото", description: "Veo 3.0 требует опорное изображение для анимации.", variant: "destructive" });
          setIsGenerating(false);
          return;
        }
        addLog("Синхронизация с узлами Veo 3.0...");
        const { videoDataUri } = await generateAiVideo({ photoDataUri: photoPreview });
        setResultUrl(videoDataUri);
        addLog("Видео-сигнал стабилизирован.");
      } else {
        addLog("Рендеринг через Imagen 4.0...");
        const { imageUrl } = await generateAiImage({ prompt: prompt });
        setResultUrl(imageUrl);
        addLog("Визуальный код сформирован.");
      }
    } catch (e: any) {
      toast({ title: "Сбой синтеза", description: e.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[120px] pointer-events-none -z-10" />
      
      <div className="px-6 pt-10 pb-6 shrink-0 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
              AI Cinema <span className="text-[8px] bg-accent/20 text-accent px-2 py-0.5 rounded-full border border-accent/20 tracking-widest font-black">STUDIO</span>
            </h1>
            <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.4em] ml-1 mt-1">Quantum Synthesis Hub</p>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10 shadow-xl">
             <MovieIcon className="w-6 h-6 text-primary animate-pulse" />
          </div>
        </div>

        <div className="flex gap-2 bg-white/5 p-1 rounded-2xl border border-white/5 shadow-inner">
           <button 
             onClick={() => setActiveTab('video')} 
             className={cn("flex-1 h-12 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", activeTab === 'video' ? "bg-primary text-white shadow-lg" : "text-white/40 hover:bg-white/5")}
           >
             Video Engine
           </button>
           <button 
             onClick={() => setActiveTab('image')} 
             className={cn("flex-1 h-12 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", activeTab === 'image' ? "bg-primary text-white shadow-lg" : "text-white/40 hover:bg-white/5")}
           >
             Visual Render
           </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-8 pb-40">
          <div className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-6 space-y-6 shadow-2xl">
             {activeTab === 'video' && (
               <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-black uppercase text-primary/60 tracking-widest">Опорное изображение</span>
                  </div>
                  {photoPreview ? (
                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 group shadow-xl">
                       <img src={photoPreview} className="w-full h-full object-cover" alt="Preview" />
                       <button 
                         onClick={() => setPhotoPreview(null)} 
                         className="absolute top-3 right-3 bg-black/60 p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                       >
                         <X className="w-4 h-4" />
                       </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full aspect-video rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 hover:bg-white/5 transition-all group"
                    >
                      <FileUp className="w-10 h-10 text-white/20 group-hover:text-primary transition-colors" />
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Выбрать фото для анимации</p>
                    </button>
                  )}
                  <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handlePhotoUpload} />
               </div>
             )}

             <div className="space-y-4 text-left">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-black uppercase text-primary/60 tracking-widest">Текстовый промпт</span>
                </div>
                <Textarea 
                  placeholder={activeTab === 'video' ? "Опишите желаемое движение (например: кинематографичная анимация, плавные тени, 4k)..." : "Опишите изображение в деталях..."}
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  className="bg-black/40 border-white/10 h-32 rounded-3xl resize-none p-5 text-sm font-medium tracking-tight focus:border-primary/50 transition-all"
                />
             </div>

             <Button 
               onClick={handleGenerate} 
               disabled={isGenerating}
               className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-2xl shadow-primary/30 active:scale-95 transition-all group relative overflow-hidden"
             >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Sparkles className="w-5 h-5 mr-2" /> Сгенерировать Сигнал</>}
             </Button>

             {!isPremium && (
               <div className="flex items-center justify-center gap-2 bg-accent/10 border border-accent/20 p-3 rounded-xl">
                 <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                 <span className="text-[8px] font-black uppercase text-accent tracking-widest">Требуется Premium Статус</span>
               </div>
             )}
          </div>

          {(isGenerating || resultUrl) && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="flex items-center justify-between px-2">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Результат генерации</h3>
                 {isGenerating && <span className="text-[8px] font-black text-primary uppercase animate-pulse">Процесс активен...</span>}
               </div>

               <div className="bg-white/[0.03] border border-white/5 rounded-[3rem] p-4 shadow-2xl relative min-h-[200px] flex flex-col items-center justify-center">
                  {isGenerating ? (
                    <div className="flex flex-col items-center gap-6 py-12">
                       <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center border border-primary/20 shadow-lg relative">
                         <Loader2 className="w-10 h-10 text-primary animate-spin" />
                         <div className="absolute -inset-4 border border-primary/10 rounded-full animate-ping opacity-20" />
                       </div>
                       <div className="text-center space-y-2">
                         {generationLog.map((log, i) => (
                           <p key={i} className="text-[9px] font-bold text-white/40 uppercase tracking-widest animate-in fade-in slide-in-from-top-1">{log}</p>
                         ))}
                       </div>
                    </div>
                  ) : resultUrl ? (
                    <div className="w-full space-y-6">
                      <div className="relative w-full rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl group">
                         {activeTab === 'video' ? (
                           <video src={resultUrl} controls autoPlay loop className="w-full h-auto aspect-video object-cover" />
                         ) : (
                           <img src={resultUrl} className="w-full h-auto object-cover" alt="Result" />
                         )}
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <a href={resultUrl} download="nuxus_ai_cinema.mp4" className="bg-white text-black p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:scale-110 active:scale-95 transition-all">
                             <Download className="w-4 h-4" /> Сохранить в Ядро
                           </a>
                         </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] font-black text-white/10 uppercase tracking-widest">Ожидание инициализации...</p>
                  )}
               </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
