
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
  LogOut, User, Share2, 
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
    avatarUrl: '',
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
        avatarUrl: profile.avatarUrl || '',
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'background') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3145728) {
      toast({ title: "Файл слишком велик", variant: "destructive" });
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
    };
    reader.readAsDataURL(file);
  };

  const handleLogout = async () => {
    await signOut(auth);
    onOpenChange(false);
  };

  return (
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

            {isAvatarPickerOpen && (
              <div className="w-full space-y-4">
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
                <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'avatar')} />
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
                <Label>Тема</Label>
                <Select value={form.theme} onValueChange={(val) => setForm({...form, theme: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Классика</SelectItem>
                    <SelectItem value="ocean">Океан</SelectItem>
                    <SelectItem value="midnight">Полночь</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Фон чата</Label>
                <div className="flex gap-2">
                  <Select value={form.chatBackground} onValueChange={(val) => setForm({...form, chatBackground: val})}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BACKGROUNDS.map(bg => (
                        <SelectItem key={bg.value} value={bg.value}>{bg.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={() => backgroundInputRef.current?.click()}>
                    <Upload className="w-4 h-4" />
                  </Button>
                  <input type="file" ref={backgroundInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'background')} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border/40 shrink-0 space-y-2">
          <Button className="w-full h-11" onClick={handleSave} disabled={isProcessing}>
             Сохранить
          </Button>
          <Button variant="ghost" className="w-full h-11 text-muted-foreground" onClick={handleLogout}>
             Выйти
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
