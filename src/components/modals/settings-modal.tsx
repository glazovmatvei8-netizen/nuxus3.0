"use client"

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  LogOut, User, LayoutGrid, Palette, Loader2, Sparkles, X, Wand2, AtSign, Smartphone, Settings2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { generateBrandVisual } from '@/ai/flows/generate-brand-visual-flow';
import { generateAiAvatar } from '@/ai/flows/generate-ai-avatar-flow';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BACKGROUNDS = [
  { name: 'Стандарт', value: 'default' },
  { name: 'Ночной город', value: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&q=80&w=800' },
  { name: 'Минимализм', value: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=800' },
  { name: 'Абстракция', value: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800' },
  { name: 'Горы', value: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=800' },
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
    chatBackground: 'default',
  });

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
        chatBackground: profile.settings?.chatBackground || 'default',
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
        ...profile?.settings,
        chatBackground: form.chatBackground,
      }
    });
    onOpenChange(false);
    toast({ title: "Настройки сохранены" });
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
      toast({ title: "AI-аватар создан" });
    } catch (e) {
      toast({ title: "Ошибка генерации аватара", variant: "destructive" });
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-2xl border-border/40 p-0 overflow-hidden max-h-[85vh] flex flex-col rounded-t-[2rem] sm:rounded-2xl">
          <DialogHeader className="p-4 border-b border-border/20 bg-muted/30 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Settings2 className="w-5 h-5 text-primary" />
              Настройки
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 px-4 py-2">
            <div className="space-y-4 py-2">
              {/* Profile Header */}
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                  <UserAvatar 
                    userId={user?.uid} 
                    manualAvatarUrl={form.avatarUrl}
                    className="h-20 w-20 border-2 border-primary/20 shadow-lg ring-offset-background" 
                    fallbackName={form.name}
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <LayoutGrid className="w-5 h-5 text-white" />
                  </div>
                  <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const r = new FileReader();
                      r.onloadend = () => setForm(prev => ({ ...prev, avatarUrl: r.result as string }));
                      r.readAsDataURL(f);
                    }
                  }} />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-base leading-tight">{form.name || 'Без имени'}</h3>
                  <p className="text-xs text-muted-foreground">{form.username || '@username'}</p>
                </div>
              </div>

              {/* Section: Account */}
              <div className="bg-muted/30 rounded-2xl p-3 space-y-3">
                <div className="flex items-center gap-2 mb-1 px-1">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Аккаунт</span>
                </div>
                <div className="space-y-2.5">
                  <div className="space-y-1">
                    <Label className="text-[10px] ml-1 text-muted-foreground">Имя</Label>
                    <Input 
                      className="bg-background/50 h-9 rounded-xl border-none focus-visible:ring-1 focus-visible:ring-primary/40" 
                      value={form.name} 
                      onChange={e => setForm({...form, name: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] ml-1 text-muted-foreground">Никнейм</Label>
                    <div className="relative">
                      <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input 
                        className="bg-background/50 h-9 rounded-xl border-none pl-9 focus-visible:ring-1 focus-visible:ring-primary/40" 
                        value={form.username} 
                        onChange={e => setForm({...form, username: e.target.value})} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Appearance */}
              <div className="bg-muted/30 rounded-2xl p-3 space-y-3">
                <div className="flex items-center gap-2 mb-1 px-1">
                  <Palette className="w-3.5 h-3.5 text-accent" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Оформление</span>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] ml-1 text-muted-foreground">Фон чатов</Label>
                  <Select value={form.chatBackground} onValueChange={(val) => setForm({...form, chatBackground: val})}>
                    <SelectTrigger className="bg-background/50 h-9 rounded-xl border-none focus:ring-1 focus:ring-primary/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/40">
                      {BACKGROUNDS.map(bg => (
                        <SelectItem key={bg.value} value={bg.value} className="text-xs">{bg.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Section: AI Features */}
              <div className="bg-primary/5 rounded-2xl p-3 space-y-2 border border-primary/10">
                <div className="flex items-center gap-2 mb-1 px-1">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">AI Возможности</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="ghost" 
                    className="h-10 text-[10px] bg-background/50 rounded-xl flex flex-col items-center justify-center gap-0.5 hover:bg-primary/10"
                    onClick={handleGenerateAiAvatar}
                    disabled={isGeneratingAvatar}
                  >
                    {isGeneratingAvatar ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                    <span>AI Аватар</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="h-10 text-[10px] bg-background/50 rounded-xl flex flex-col items-center justify-center gap-0.5 hover:bg-accent/10"
                    onClick={handleGenerateVisual}
                    disabled={isGeneratingVisual}
                  >
                    {isGeneratingVisual ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    <span>Концепт</span>
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-border/20 bg-muted/20 shrink-0 grid grid-cols-5 gap-2">
            <Button className="col-span-4 h-10 rounded-xl font-bold shadow-lg shadow-primary/20" onClick={handleSave}>
               Сохранить
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive/10" onClick={handleLogout}>
               <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showBrandVisual} onOpenChange={setShowBrandVisual}>
        <DialogContent className="max-w-3xl bg-black/90 border-none p-0 overflow-hidden">
          <div className="relative aspect-video flex items-center justify-center">
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
                alt="NuxusChat Visual" 
                className="w-full h-full object-contain animate-in fade-in zoom-in-95"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
