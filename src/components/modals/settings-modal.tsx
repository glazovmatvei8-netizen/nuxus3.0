"use client"

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  LogOut, User, AtSign, Share2, 
  Trash2, LayoutGrid, Upload, Palette, Image as ImageIcon, Type, Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut, deleteUser } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { cn } from '@/lib/utils';

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
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  const userRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile } = useDoc(userRef);

  const [form, setForm] = useState({
    name: '',
    username: '',
    bio: '',
    avatarUrl: '',
    inactivityDeletion: 'never',
    theme: 'default',
    chatBackground: 'default',
    messageSize: 'medium'
  });

  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  React.useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        avatarUrl: profile.avatarUrl || '',
        inactivityDeletion: profile.inactivityDeletion || 'never',
        theme: profile.settings?.theme || 'default',
        chatBackground: profile.settings?.chatBackground || 'default',
        messageSize: profile.settings?.messageSize || 'medium'
      });
    }
  }, [profile]);

  const resizeImage = (base64Str: string, maxWidth = 400, maxHeight = 400): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    });
  };

  const handleSave = () => {
    if (!userRef) return;
    updateDocumentNonBlocking(userRef, {
      name: form.name,
      username: form.username,
      bio: form.bio,
      avatarUrl: form.avatarUrl,
      inactivityDeletion: form.inactivityDeletion,
      settings: {
        theme: form.theme,
        chatBackground: form.chatBackground,
        messageSize: form.messageSize
      }
    });
    onOpenChange(false);
    toast({ title: "Сохранено", description: "Ваш профиль и настройки обновлены." });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'background') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3145728) { // 3MB
      toast({ title: "Файл слишком велик", description: "Выберите изображение до 3 МБ.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const optimized = type === 'avatar' ? await resizeImage(base64, 400, 400) : await resizeImage(base64, 1200, 1200);
      
      if (type === 'avatar') {
        setForm(prev => ({ ...prev, avatarUrl: optimized }));
        setIsAvatarPickerOpen(false);
      } else {
        setForm(prev => ({ ...prev, chatBackground: optimized }));
      }
      setIsProcessing(false);
      toast({ title: "Фото готово", description: "Не забудьте сохранить изменения." });
    };
    reader.readAsDataURL(file);
  };

  const handleLogout = async () => {
    await signOut(auth);
    onOpenChange(false);
  };

  const handleDeleteAccount = async () => {
    if (!user || !userRef) return;
    if (!confirm("Вы уверены? Это действие нельзя отменить! Все данные будут удалены.")) return;

    try {
      await deleteDoc(userRef);
      await deleteUser(user);
      toast({ title: "Удалено", description: "Ваш аккаунт стерт." });
    } catch (e: any) {
      toast({ title: "Ошибка", description: "Пожалуйста, перезайдите в систему перед удалением.", variant: "destructive" });
    }
  };

  const copyInvite = () => {
    if (!profile?.username) return;
    const inviteText = `Привет! Мой ник в NuxusChat: ${profile.username}\nЗаходи: ${window.location.origin}`;
    navigator.clipboard.writeText(inviteText);
    toast({ title: "Скопировано!" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-border/40 p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="p-6 bg-primary/5 border-b border-border/40 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <User className="w-5 h-5 text-primary" />
            Настройки профиля
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => setIsAvatarPickerOpen(!isAvatarPickerOpen)}>
              <div className="relative">
                <UserAvatar 
                  userId={user?.uid} 
                  manualAvatarUrl={form.avatarUrl}
                  className="h-24 w-24 border-4 border-background shadow-xl ring-2 ring-primary/20 hover:scale-105 transition-transform" 
                  fallbackName={form.name}
                />
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <LayoutGrid className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {isAvatarPickerOpen && (
              <div className="w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="grid grid-cols-6 gap-2 p-3 bg-muted/30 rounded-2xl">
                  {PRESET_AVATARS.map((url, i) => (
                    <button 
                      key={i} 
                      onClick={() => { setForm({...form, avatarUrl: url}); setIsAvatarPickerOpen(false); }}
                      className="relative hover:scale-110 transition-transform"
                    >
                      <UserAvatar userId={null} manualAvatarUrl={url} className={cn("h-10 w-10 border-2 transition-all", form.avatarUrl === url ? 'border-primary' : 'border-transparent')} fallbackName={`P${i}`} />
                    </button>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'avatar')} />
                  <Button 
                    variant="outline" 
                    className="flex-1 rounded-xl h-10 border-primary/20 hover:bg-primary/10 gap-2"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isProcessing}
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Загрузить фото
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="rounded-xl h-10 px-3"
                    onClick={() => setIsAvatarPickerOpen(false)}
                  >
                    Отмена
                  </Button>
                </div>
              </div>
            )}

            <div className="text-center w-full">
              <h3 className="text-lg font-bold">{form.name}</h3>
              <div className="flex items-center justify-center gap-2 mt-1">
                <p className="text-sm text-muted-foreground">{form.username}</p>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyInvite}>
                  <Share2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Основные данные</h4>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground ml-1">Полное имя</Label>
                <Input 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="bg-muted/30 border-muted-foreground/10 h-11 rounded-xl pl-4"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground ml-1">О себе (Bio)</Label>
                <Textarea 
                  value={form.bio} 
                  onChange={e => setForm({...form, bio: e.target.value})}
                  placeholder="Расскажите о себе..."
                  className="bg-muted/30 border-muted-foreground/10 rounded-xl min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground ml-1">Никнейм</Label>
                <Input 
                  value={form.username} 
                  onChange={e => setForm({...form, username: e.target.value})}
                  className="bg-muted/30 border-muted-foreground/10 h-11 rounded-xl pl-4"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Оформление</h4>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground ml-1 flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5" /> Цветовая тема
                </Label>
                <Select value={form.theme} onValueChange={(val) => setForm({...form, theme: val})}>
                  <SelectTrigger className="bg-muted/30 border-muted-foreground/10 h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Классика (Nuxus Blue)</SelectItem>
                    <SelectItem value="ocean">Океан (Breezy Blue)</SelectItem>
                    <SelectItem value="forest">Лес (Natural Green)</SelectItem>
                    <SelectItem value="sunset">Закат (Warm Orange)</SelectItem>
                    <SelectItem value="midnight">Полночь (Deep Black)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground ml-1 flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5" /> Фон чата
                </Label>
                <div className="flex gap-2">
                  <Select value={form.chatBackground} onValueChange={(val) => setForm({...form, chatBackground: val})}>
                    <SelectTrigger className="flex-1 bg-muted/30 border-muted-foreground/10 h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BACKGROUNDS.map(bg => (
                        <SelectItem key={bg.value} value={bg.value}>{bg.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input type="file" ref={backgroundInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'background')} />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-11 w-11 shrink-0 rounded-xl border-muted-foreground/10 bg-muted/30 hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={() => backgroundInputRef.current?.click()}
                    disabled={isProcessing}
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground ml-1 flex items-center gap-2">
                  <Type className="w-3.5 h-3.5" /> Размер сообщений
                </Label>
                <Select value={form.messageSize} onValueChange={(val) => setForm({...form, messageSize: val})}>
                  <SelectTrigger className="bg-muted/30 border-muted-foreground/10 h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Крошечный</SelectItem>
                    <SelectItem value="medium">Средний (Стандарт)</SelectItem>
                    <SelectItem value="large">Большой</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 pt-2 border-t border-border/40 shrink-0 space-y-2 bg-card/80 backdrop-blur-md">
          <Button className="w-full h-11 rounded-xl shadow-lg shadow-primary/20 font-bold" onClick={handleSave} disabled={isProcessing}>
            Сохранить изменения
          </Button>
          
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1 h-11 rounded-xl text-muted-foreground hover:bg-muted/30" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Выйти
            </Button>
            <Button variant="ghost" className="flex-1 h-11 rounded-xl text-destructive hover:bg-destructive/10" onClick={handleDeleteAccount}>
              <Trash2 className="w-4 h-4 mr-2" /> Удалить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
