
"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  LogOut, User as UserIcon, LayoutGrid, Palette, Loader2, Sparkles, Wand2, AtSign, Settings2, Check, 
  ShieldCheck, Lock, UserX, Star, Crown, Bell, Database, Smartphone, Globe, Type
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { generateAiAvatar } from '@/ai/flows/generate-ai-avatar-flow';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDisplayName, isUserPremium, cn } from '@/lib/utils';
import type { User } from '@/lib/types';

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

  const { data: profile } = useDoc<User>(userRef);
  const isPremium = isUserPremium(profile);

  const [form, setForm] = useState({
    name: '',
    username: '',
    bio: '',
    avatarUrl: '',
    chatBackground: 'default',
    messageSize: 'medium',
    phoneVisibility: 'nobody',
    lastSeenVisibility: 'everybody',
    allowGroupsFrom: 'everybody',
    whoCanMessageMe: 'everybody',
    showPreview: true,
    sounds: true,
  });

  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (profile && (!isInitialized.current || !open)) {
      setForm({
        name: profile.name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        avatarUrl: profile.avatarUrl || '',
        chatBackground: profile.settings?.chatBackground || 'default',
        messageSize: profile.settings?.messageSize || 'medium',
        phoneVisibility: profile.settings?.privacy?.phoneVisibility || 'nobody',
        lastSeenVisibility: profile.settings?.privacy?.lastSeenVisibility || 'everybody',
        allowGroupsFrom: profile.settings?.privacy?.allowGroupsFrom || 'everybody',
        whoCanMessageMe: profile.settings?.privacy?.whoCanMessageMe || 'everybody',
        showPreview: profile.settings?.notifications?.showPreview ?? true,
        sounds: profile.settings?.notifications?.sounds ?? true,
      });
      if (open) isInitialized.current = true;
    }
  }, [profile, open]);

  const handleSave = () => {
    if (!userRef) return;
    updateDocumentNonBlocking(userRef, {
      name: form.name,
      username: form.username.startsWith('@') ? form.username.toLowerCase() : '@' + form.username.toLowerCase(),
      bio: form.bio,
      avatarUrl: form.avatarUrl,
      settings: {
        ...profile?.settings,
        chatBackground: form.chatBackground,
        messageSize: form.messageSize,
        notifications: {
          showPreview: form.showPreview,
          sounds: form.sounds,
        },
        privacy: {
          ...profile?.settings?.privacy,
          phoneVisibility: form.phoneVisibility,
          lastSeenVisibility: form.lastSeenVisibility,
          allowGroupsFrom: form.allowGroupsFrom,
          whoCanMessageMe: form.whoCanMessageMe,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card/95 backdrop-blur-2xl border-border/40 p-0 overflow-hidden h-[90vh] flex flex-col rounded-t-3xl sm:rounded-2xl shadow-2xl">
        <DialogHeader className="p-4 border-b border-border/20 bg-muted/30 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Settings2 className="w-5 h-5 text-primary" />
            <span>Настройки</span>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="flex flex-col">
            <div className="flex flex-col items-center gap-4 py-6 bg-gradient-to-b from-primary/10 to-transparent shrink-0">
              <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                <UserAvatar 
                  userId={user?.uid} 
                  manualAvatarUrl={form.avatarUrl}
                  className="h-28 w-28 border-4 border-background shadow-2xl" 
                  fallbackName={form.name}
                />
                <div className="absolute bottom-1 right-1 bg-primary p-2 rounded-full border-2 border-background shadow-lg group-hover:scale-110 transition-transform">
                  <LayoutGrid className="w-4 h-4 text-white" />
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
              <div className="text-center px-4">
                <h3 className="font-bold text-xl leading-tight flex items-center justify-center gap-2">
                  {formatDisplayName(form.name) || 'Без имени'}
                  {isPremium && <Star className="w-5 h-5 text-accent fill-accent" />}
                </h3>
                <p className="text-sm text-muted-foreground">{form.username || '@username'}</p>
              </div>
            </div>

            <div className="p-4 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                  <UserIcon className="w-4 h-4" /> Аккаунт
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground ml-1">Имя</Label>
                    <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-muted/30 border-none h-11 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground ml-1">Никнейм</Label>
                    <div className="relative">
                      <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="bg-muted/30 border-none h-11 rounded-xl pl-9" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground ml-1">О себе</Label>
                    <Textarea 
                      value={form.bio} 
                      onChange={e => setForm({...form, bio: e.target.value})} 
                      placeholder="Напишите что-нибудь о себе..."
                      className="bg-muted/30 border-none rounded-xl min-h-[80px] resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className={cn(
                "p-4 rounded-2xl border transition-all",
                isPremium ? "bg-gradient-to-br from-purple-500/20 via-accent/10 to-primary/10 border-purple-500/30" : "bg-muted/30 border-border/40"
              )}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Crown className={cn("w-5 h-5", isPremium ? "text-accent" : "text-muted-foreground")} />
                    <span className="font-bold text-sm">Nuxus Premium</span>
                  </div>
                  {isPremium ? <Check className="text-accent w-5 h-5" /> : <Lock className="text-muted-foreground w-4 h-4" />}
                </div>
                <p className="text-[11px] text-muted-foreground mb-4">
                  {isPremium 
                    ? "Все возможности Nuxus Premium доступны в вашем профиле." 
                    : "Получите уникальные реакции, расшифровку голоса и другие возможности."}
                </p>
                {!isPremium && (
                  <Button variant="outline" className="w-full h-9 rounded-xl text-xs font-bold border-primary/20 hover:bg-primary/10">
                    Узнать больше
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">Уведомления и звуки</span>
                  </div>
                  <Switch checked={form.sounds} onCheckedChange={(val) => setForm({...form, sounds: val})} />
                </div>

                <div className="space-y-2 p-4 bg-muted/20 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4 text-accent" />
                    <span className="text-xs font-bold text-muted-foreground uppercase">Конфиденциальность</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Номер телефона</span>
                      <span className="text-xs text-primary font-medium">{form.phoneVisibility === 'nobody' ? 'Никто' : 'Все'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Последняя активность</span>
                      <span className="text-xs text-primary font-medium">{form.lastSeenVisibility === 'everybody' ? 'Все' : 'Никто'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Кто может мне писать</span>
                        {!isPremium && <Lock className="w-3 h-3 text-muted-foreground" />}
                      </div>
                      <Select disabled={!isPremium} value={form.whoCanMessageMe} onValueChange={(val) => setForm({...form, whoCanMessageMe: val as any})}>
                        <SelectTrigger className={cn("w-28 h-8 text-[10px] bg-background/50 border-none rounded-lg", !isPremium && "opacity-50")}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="everybody">Все</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-muted/20 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Palette className="w-4 h-4 text-accent" />
                    <span className="text-xs font-bold text-muted-foreground uppercase">Настройки чатов</span>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-2"><Type className="w-3 h-3" /> Размер текста</Label>
                      <Select value={form.messageSize} onValueChange={(val) => setForm({...form, messageSize: val as any})}>
                        <SelectTrigger className="bg-background/50 border-none rounded-xl h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Мелкий</SelectItem>
                          <SelectItem value="medium">Средний</SelectItem>
                          <SelectItem value="large">Крупный</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Фон чатов</Label>
                      <Select value={form.chatBackground} onValueChange={(val) => setForm({...form, chatBackground: val})}>
                        <SelectTrigger className="bg-background/50 border-none rounded-xl h-10">
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
                </div>

                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 space-y-3">
                  <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest">
                    <Sparkles className="w-3 h-3" /> AI Лаборатория
                  </div>
                  <Button 
                    variant="ghost" 
                    className="w-full h-10 bg-background/50 rounded-xl text-xs flex items-center justify-between px-4"
                    onClick={handleGenerateAiAvatar}
                    disabled={isGeneratingAvatar}
                  >
                    <div className="flex items-center gap-3">
                      {isGeneratingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4 text-primary" />}
                      <span>Создать AI-аватар</span>
                    </div>
                  </Button>
                </div>
              </div>

              <div className="pt-4 space-y-2 pb-12">
                <Button 
                  variant="ghost" 
                  className="w-full h-11 rounded-xl text-destructive hover:bg-destructive/10 justify-start gap-3"
                  onClick={handleLogout}
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-bold">Выйти</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full h-11 rounded-xl text-destructive/60 hover:text-destructive hover:bg-destructive/5 justify-start gap-3"
                  onClick={() => {
                    if (confirm('Вы уверены? Это действие нельзя отменить.')) {
                      setIsDeleting(true);
                      updateDocumentNonBlocking(userRef!, { isBanned: true, name: 'Удалённый Аккаунт', username: '@deleted' });
                      setTimeout(() => signOut(auth), 1000);
                    }
                  }}
                  disabled={isDeleting}
                >
                  <UserX className="w-5 h-5" />
                  <span className="font-bold">{isDeleting ? 'Удаление...' : 'Удалить аккаунт'}</span>
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border/20 bg-muted/20 shrink-0">
          <Button className="w-full h-12 rounded-xl font-bold shadow-lg" onClick={handleSave}>
             <Check className="w-5 h-5 mr-2" /> Применить изменения
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
