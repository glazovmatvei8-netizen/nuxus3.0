
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
  LogOut, User, AtSign, Copy, Share2, 
  Trash2, Clock, CheckCircle2, LayoutGrid, Upload, Image as ImageIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut, deleteUser } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

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

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile } = useDoc(userRef);

  const [form, setForm] = useState({
    name: '',
    username: '',
    avatarUrl: '',
    inactivityDeletion: 'never'
  });

  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);

  React.useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || '',
        username: profile.username || '',
        avatarUrl: profile.avatarUrl || '',
        inactivityDeletion: profile.inactivityDeletion || 'never'
      });
    }
  }, [profile]);

  const handleSave = () => {
    if (!userRef) return;
    updateDocumentNonBlocking(userRef, {
      name: form.name,
      username: form.username,
      avatarUrl: form.avatarUrl,
      inactivityDeletion: form.inactivityDeletion
    });
    onOpenChange(false);
    toast({ title: "Сохранено", description: "Ваш профиль обновлен." });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) { // Примерно 800KB лимит для Base64 в Firestore
        toast({ title: "Файл слишком велик", description: "Выберите изображение поменьше", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, avatarUrl: reader.result as string }));
        setIsAvatarPickerOpen(false);
        toast({ title: "Фото загружено", description: "Не забудьте сохранить изменения" });
      };
      reader.readAsDataURL(file);
    }
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
      <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-border/40 p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader className="p-6 bg-primary/5 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <User className="w-5 h-5 text-primary" />
            Настройки профиля
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => setIsAvatarPickerOpen(!isAvatarPickerOpen)}>
              <div className="relative">
                <UserAvatar 
                  userId={user?.uid} 
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
                      <UserAvatar userId={null} className={`h-10 w-10 border-2 transition-all ${form.avatarUrl === url ? 'border-primary' : 'border-transparent'}`} fallbackName={`P${i}`} />
                      {form.avatarUrl === url && <CheckCircle2 className="absolute -top-1 -right-1 w-3 h-3 text-primary bg-background rounded-full" />}
                    </button>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                  <Button 
                    variant="outline" 
                    className="flex-1 rounded-xl h-10 border-primary/20 hover:bg-primary/10 gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4" /> Загрузить фото
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
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Полное имя</Label>
              <Input 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})}
                className="bg-muted/30 border-muted-foreground/10 h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Ник</Label>
              <Input 
                value={form.username} 
                onChange={e => setForm({...form, username: e.target.value})}
                className="bg-muted/30 border-muted-foreground/10 h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-muted-foreground flex items-center gap-2 uppercase tracking-wider ml-1">
                <Clock className="w-3 h-3" /> Удалить аккаунт при бездействии
              </Label>
              <Select 
                value={form.inactivityDeletion} 
                onValueChange={(val) => setForm({...form, inactivityDeletion: val})}
              >
                <SelectTrigger className="bg-muted/30 border-muted-foreground/10 h-11 rounded-xl">
                  <SelectValue placeholder="Выберите срок" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Никогда</SelectItem>
                  <SelectItem value="1_month">1 месяц</SelectItem>
                  <SelectItem value="2_months">2 месяца</SelectItem>
                  <SelectItem value="6_months">6 месяцев</SelectItem>
                  <SelectItem value="1_year">1 год</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4 space-y-2">
            <Button className="w-full h-11 rounded-xl shadow-lg shadow-primary/20 font-bold" onClick={handleSave}>
              Сохранить изменения
            </Button>
            <Button variant="outline" className="w-full h-11 rounded-xl border-primary/10" onClick={copyInvite}>
              <Copy className="w-4 h-4 mr-2" /> Пригласить друга
            </Button>
            
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                className="flex-1 h-11 rounded-xl text-muted-foreground hover:bg-muted/30" 
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" /> Выйти
              </Button>
              <Button 
                variant="ghost" 
                className="flex-1 h-11 rounded-xl text-destructive hover:bg-destructive/10" 
                onClick={handleDeleteAccount}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Удалить
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
