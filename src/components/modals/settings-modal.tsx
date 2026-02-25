"use client"

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { UserAvatar } from '@/components/user-avatar';
import { 
  LogOut, User, Share2, 
  Trash2, LayoutGrid, Upload, Palette, ImageIcon, Type, Loader2, Sparkles, X, Wand2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { generateBrandVisual } from '@/ai/flows/generate-brand-visual-flow';
import { generateAiAvatar } from '@/ai/flows/generate-ai-avatar-flow';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESET_AVATARS = [
  'https://picsum.photos/seed/1/200',
  'https://picsum.photos/seed/2/200',
  'https://picsum.photos/seed/3/200',
  'https://picsum.photos/seed/4/200',
  'https://picsum.photos/seed/5/200',
  'https://picsum.photos/seed/6/200',
];

const BACKGROUNDS = [
  { name: 'Стандарт', value: 'default' },
  { name: 'Ночной город', value: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&q=80&w=800' },
  { name: 'Минимализм', value: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=800' },
  { name: 'Абстракция', value: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800' },
  { name: 'Горы', value: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=800' },
  { name: 'Текстура', value: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=800' },
];

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const userRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile } = useDoc(userRef);

  const [form, setForm] = useState({
    name: '',
    username: '',
    avatarUrl: '',
    theme: 'default',
    chatBackground: 'default',
    messageSize: 'medium'
  });

  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBrandVisual, setShowBrandVisual] = useState(false);
  const [brandImageUrl, setBrandImageUrl] = useState<string | null>(null);
  const [isGeneratingVisual, setIsGeneratingVisual] = useState(false);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);

  React.useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || '',
        username: profile.username || '',
        avatarUrl: profile.avatarUrl || '',
        theme: profile.settings?.theme || 'default',
        chatBackground: profile.settings?.chatBackground || 'default',
        messageSize: profile.settings?.messageSize || 'medium'
      });
    }
  }, [profile]);

  const handleSave = () => {
    if (!userRef) return;
    updateDocumentNonBlocking(userRef, {
      name: form.name,
      username: form.username,
      avatarUrl: form.avatarUrl,
      settings: {
        theme: form.theme,
        chatBackground: form.chatBackground,
        messageSize: form.messageSize
      }
    });
    onOpenChange(false);
    toast({ title: "Сохранено" });
  };

  const handleLogout = async () => {
    await signOut(auth);
    onOpenChange(false);
  };

  const handleGenerateVisual = async () => {
    setIsGeneratingVisual(true);
    try {
      const result = await generateBrandVisual({});
      setBrandImageUrl(result.imageUrl);
      setShowBrandVisual(true);
    } catch (e) {
      toast({ title: "Ошибка генерации", variant: "destructive" });
    } finally {
      setIsGeneratingVisual(false);
    }
  };

  const handleGenerateAiAvatar = async () => {
    setIsGeneratingAvatar(true);
    try {
      const result = await generateAiAvatar();
      setForm(prev => ({ ...prev, avatarUrl: result.imageUrl }));
      toast({ title: "AI-аватар готов!", description: "Нажмите 'Сохранить', чтобы применить его." });
    } catch (e) {
      toast({ title: "Ошибка генерации аватара", variant: "destructive" });
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-border/40 p-0 overflow-hidden max-h-[90vh] flex flex-col">
          <DialogHeader className="p-6 bg-primary/5 border-b border-border/40 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <User className="w-5 h-5 text-primary" />
              Настройки
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
            <div className="flex flex-col items-center gap-4">
              <div className="relative group cursor-pointer" onClick={() => setIsAvatarPickerOpen(!isAvatarPickerOpen)}>
                <UserAvatar 
                  userId={user?.uid} 
                  manualAvatarUrl={form.avatarUrl}
                  className="h-24 w-24 border-4 border-background shadow-xl ring-2 ring-primary/20" 
                  fallbackName={form.name}
                />
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <LayoutGrid className="w-6 h-6 text-white" />
                </div>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2 rounded-full border-primary/40 text-primary hover:bg-primary/10 h-8"
                onClick={handleGenerateAiAvatar}
                disabled={isGeneratingAvatar}
              >
                {isGeneratingAvatar ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                Сгенерировать AI-аватар
              </Button>

              {isAvatarPickerOpen && (
                <div className="w-full space-y-4 animate-in slide-in-from-top-2">
                  <div className="grid grid-cols-6 gap-2 p-3 bg-muted/30 rounded-2xl">
                    {PRESET_AVATARS.map((url, i) => (
                      <button key={i} onClick={() => { setForm({...form, avatarUrl: url}); setIsAvatarPickerOpen(false); }}>
                        <UserAvatar userId={null} manualAvatarUrl={url} className="h-10 w-10" fallbackName={`P${i}`} />
                      </button>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => avatarInputRef.current?.click()}>
                    Загрузить фото
                  </Button>
                  <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const r = new FileReader();
                      r.onloadend = () => {
                        setForm(prev => ({ ...prev, avatarUrl: r.result as string }));
                        setIsAvatarPickerOpen(false);
                      };
                      r.readAsDataURL(f);
                    }
                  }} />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Имя</Label>
                  <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>@username</Label>
                  <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Фон чата</Label>
                  <Select value={form.chatBackground} onValueChange={(val) => setForm({...form, chatBackground: val})}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BACKGROUNDS.map(bg => (
                        <SelectItem key={bg.value} value={bg.value}>{bg.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="pt-4 border-t border-border/40">
                  <Button 
                    variant="outline" 
                    className="w-full flex items-center gap-2 border-accent/40 text-accent hover:bg-accent/10"
                    onClick={handleGenerateVisual}
                    disabled={isGeneratingVisual}
                  >
                    {isGeneratingVisual ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Концепт мессенджера (AI)
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-border/40 shrink-0 space-y-2">
            <Button className="w-full h-11" onClick={handleSave} disabled={isProcessing}>
               Сохранить изменения
            </Button>
            <Button variant="ghost" className="w-full h-11 text-muted-foreground" onClick={handleLogout}>
               Выйти
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showBrandVisual} onOpenChange={setShowBrandVisual}>
        <DialogContent className="max-w-3xl bg-black/90 border-none p-0 overflow-hidden">
          <div className="relative aspect-video flex items-center justify-center group">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
              onClick={() => setShowBrandVisual(false)}
            >
              <X className="w-6 h-6" />
            </Button>
            {brandImageUrl && (
              <img 
                src={brandImageUrl} 
                alt="NuxusChat Brand Visual" 
                className="w-full h-full object-contain animate-in fade-in zoom-in-95 duration-700"
              />
            )}
            <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
              <h3 className="text-xl font-bold text-white mb-1">NuxusChat Vision</h3>
              <p className="text-sm text-white/60">Conceptual 3D render generated by AI</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
