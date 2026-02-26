
"use client"

import React, { useState, useRef, useEffect } from 'react';
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
  LogOut, User, LayoutGrid, Palette, Loader2, Sparkles, X, Wand2, AtSign, Settings2, Check, ShieldCheck, Lock, Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { generateBrandVisual } from '@/ai/flows/generate-brand-visual-flow';
import { generateAiAvatar } from '@/ai/flows/generate-ai-avatar-flow';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const isInitialized = useRef(false);

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
    phoneVisibility: 'nobody',
    lastSeenVisibility: 'everybody',
    inactivityDeletion: 'never',
  });

  const [showBrandVisual, setShowBrandVisual] = useState(false);
  const [brandImageUrl, setBrandImageUrl] = useState<string | null>(null);
  const [isGeneratingVisual, setIsGeneratingVisual] = useState(false);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);

  // Инициализируем форму только один раз при открытии модалки или при первой загрузке профиля
  useEffect(() => {
    if (profile && (!isInitialized.current || !open)) {
      setForm({
        name: profile.name || '',
        username: profile.username || '',
        avatarUrl: profile.avatarUrl || '',
        chatBackground: profile.settings?.chatBackground || 'default',
        phoneVisibility: profile.settings?.privacy?.phoneVisibility || 'nobody',
        lastSeenVisibility: profile.settings?.privacy?.lastSeenVisibility || 'everybody',
        inactivityDeletion: profile.inactivityDeletion || 'never',
      });
      if (open) isInitialized.current = true;
    }
  }, [profile, open]);

  // Сбрасываем флаг инициализации при закрытии
  useEffect(() => {
    if (!open) {
      isInitialized.current = false;
    }
  }, [open]);

  const handleSave = () => {
    if (!userRef) return;
    updateDocumentNonBlocking(userRef, {
      name: form.name,
      username: form.username,
      avatarUrl: form.avatarUrl,
      inactivityDeletion: form.inactivityDeletion,
      settings: {
        ...profile?.settings,
        chatBackground: form.chatBackground,
        privacy: {
          ...profile?.settings?.privacy,
          phoneVisibility: form.phoneVisibility,
          lastSeenVisibility: form.lastSeenVisibility,
        }
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
      toast({ title: "AI-аватар создан. Не забудьте сохранить!" });
    } catch (e) {
      toast({ title: "Ошибка генерации аватара", variant: "destructive" });
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-2xl border-border/40 p-0 overflow-hidden max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-2xl">
          <DialogHeader className="p-4 border-b border-border/20 bg-muted/30 shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg font-bold">
                <Settings2 className="w-5 h-5 text-primary" />
                <span>Настройки</span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => onOpenChange(false)}>
                <X className="w-5 h-5" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-5 pb-8">
              <div className="flex flex-col items-center gap-4 py-2">
                <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                  <UserAvatar 
                    userId={user?.uid} 
                    manualAvatarUrl={form.avatarUrl}
                    className="h-24 w-24 border-4 border-primary/20 shadow-xl" 
                    fallbackName={form.name}
                  />
                  <div className="absolute bottom-0 right-0 bg-primary p-2 rounded-full border-2 border-background shadow-lg">
                    <LayoutGrid className="w-4 h-4 text-white" />
                  </div>
                  <input type="file" key={form.avatarUrl} ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const r = new FileReader();
                      r.onloadend = () => setForm(prev => ({ ...prev, avatarUrl: r.result as string }));
                      r.readAsDataURL(f);
                    }
                  }} />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-xl leading-tight">{form.name || 'Без имени'}</h3>
                  <p className="text-sm text-muted-foreground">{form.username || '@username'}</p>
                </div>
              </div>

              <div className="bg-muted/30 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Аккаунт</span>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs ml-1 font-semibold text-muted-foreground">Имя</Label>
                    <Input 
                      className="bg-background/50 h-11 rounded-xl border-border/20" 
                      value={form.name} 
                      onChange={e => setForm({...form, name: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs ml-1 font-semibold text-muted-foreground">Никнейм</Label>
                    <div className="relative">
                      <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        className="bg-background/50 h-11 rounded-xl border-border/20 pl-9" 
                        value={form.username} 
                        onChange={e => setForm({...form, username: e.target.value})} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-muted/30 rounded-2xl p-4 space-y-4 border border-accent/10">
                <div className="flex items-center gap-2 px-1">
                  <ShieldCheck className="w-4 h-4 text-accent" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Конфиденциальность</span>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs ml-1 font-semibold text-muted-foreground">Номер телефона</Label>
                    <Select value={form.phoneVisibility} onValueChange={(val) => setForm({...form, phoneVisibility: val as any})}>
                      <SelectTrigger className="bg-background/50 h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="everybody">Все</SelectItem>
                        <SelectItem value="contacts">Мои контакты</SelectItem>
                        <SelectItem value="nobody">Никто</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs ml-1 font-semibold text-muted-foreground">Последняя активность</Label>
                    <Select value={form.lastSeenVisibility} onValueChange={(val) => setForm({...form, lastSeenVisibility: val as any})}>
                      <SelectTrigger className="bg-background/50 h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="everybody">Все</SelectItem>
                        <SelectItem value="nobody">Никто</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs ml-1 font-semibold text-muted-foreground">Удалить аккаунт при неактивности</Label>
                    <Select value={form.inactivityDeletion} onValueChange={(val) => setForm({...form, inactivityDeletion: val as any})}>
                      <SelectTrigger className="bg-background/50 h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-month">Через 1 месяц</SelectItem>
                        <SelectItem value="3-months">Через 3 месяца</SelectItem>
                        <SelectItem value="6-months">Через 6 месяцев</SelectItem>
                        <SelectItem value="1-year">Через 1 год</SelectItem>
                        <SelectItem value="never">Никогда</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="bg-muted/30 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Palette className="w-4 h-4 text-accent" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Оформление</span>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs ml-1 font-semibold text-muted-foreground">Фон чатов</Label>
                  <Select value={form.chatBackground} onValueChange={(val) => setForm({...form, chatBackground: val})}>
                    <SelectTrigger className="bg-background/50 h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BACKGROUNDS.map(bg => (
                        <SelectItem key={bg.value} value={bg.value}>{bg.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-primary/5 rounded-2xl p-4 space-y-3 border border-primary/10">
                <div className="flex items-center gap-2 px-1">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-widest text-primary/70">AI Лаборатория</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Button 
                    variant="ghost" 
                    className="w-full h-12 bg-background/50 rounded-xl flex items-center justify-between px-4"
                    onClick={handleGenerateAiAvatar}
                    disabled={isGeneratingAvatar}
                  >
                    <div className="flex items-center gap-3">
                      {isGeneratingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4 text-primary" />}
                      <span className="text-sm font-medium">Создать AI-аватар</span>
                    </div>
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full h-12 bg-background/50 rounded-xl flex items-center justify-between px-4"
                    onClick={handleGenerateVisual}
                    disabled={isGeneratingVisual}
                  >
                    <div className="flex items-center gap-3">
                      {isGeneratingVisual ? <Loader2 className="w-4 h-4 animate-spin" /> : <LayoutGrid className="w-4 h-4 text-accent" />}
                      <span className="text-sm font-medium">Концепт мессенджера</span>
                    </div>
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-border/20 bg-muted/20 shrink-0 flex gap-2">
            <Button className="flex-1 h-12 rounded-xl font-bold shadow-lg" onClick={handleSave}>
               <Check className="w-5 h-5 mr-2" /> Сохранить
            </Button>
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl text-destructive" onClick={handleLogout}>
               <LogOut className="w-6 h-6" />
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
              className="absolute top-4 right-4 z-10 text-white"
              onClick={() => setShowBrandVisual(false)}
            >
              <X className="w-6 h-6" />
            </Button>
            {brandImageUrl && <img src={brandImageUrl} alt="NuxusChat Visual" className="w-full h-full object-contain" />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
