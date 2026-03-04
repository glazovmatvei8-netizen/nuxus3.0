
"use client"

import React from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, query, collection, where, limit, getDocs, addDoc } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  QrCode, Pencil, Link, Bell, Lock, 
  MessageSquare, Bookmark, ChevronRight, Star, Smile
} from 'lucide-react';
import { useAppState } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { formatDisplayName, cn, isUserPremium } from '@/lib/utils';
import type { User } from '@/lib/types';

export default function ProfileView() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { setIsSettingsOpen, setSettingsTab, setCurrentChatId, setActiveView } = useAppState();
  
  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userProfileRef);

  const handleInvite = () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}?ref=${user?.uid}` : '';
    navigator.clipboard.writeText(url);
    toast({ title: "Ссылка скопирована" });
  };

  const openSavedMessages = async () => {
    if (!db || !user) return;
    try {
      const q = query(
        collection(db, 'chats'),
        where('type', '==', 'saved'),
        where('participantIds', 'array-contains', user.uid),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setCurrentChatId(snap.docs[0].id);
      } else {
        const newChat = await addDoc(collection(db, 'chats'), {
          type: 'saved',
          participantIds: [user.uid],
          ownerId: user.uid,
          createdAt: new Date().toISOString(),
          name: 'Избранное'
        });
        setCurrentChatId(newChat.id);
      }
      setActiveView('chats');
    } catch (e) {}
  };

  const openSettings = (tab: string) => {
    setSettingsTab(tab);
    setIsSettingsOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-center justify-between shrink-0">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/5 rounded-xl">
          <QrCode className="w-6 h-6" />
        </Button>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <UserAvatar userId={user?.uid} className="h-8 w-8" />
            {profile?.statusEmoji && (
              <div className="absolute -bottom-1 -left-1 bg-[#1c1c1e] rounded-full p-0.5 border border-white/5 shadow-lg z-20">
                <span className="text-[8px]">{profile.statusEmoji}</span>
              </div>
            )}
          </div>
          <span className="font-bold text-white text-[17px] flex items-center gap-1.5">
            {formatDisplayName(profile?.name)}
            {isUserPremium(profile) && <Star className="w-3.5 h-3.5 text-accent fill-accent" />}
          </span>
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white hover:bg-white/5 rounded-xl"
          onClick={() => openSettings('profile')}
        >
          <Pencil className="w-6 h-6" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 space-y-4 pb-24">
          
          {/* Status Block */}
          {profile?.statusText && (
            <div 
              onClick={() => openSettings('profile')}
              className="bg-primary/5 border border-primary/10 p-4 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-primary/10 transition-all"
            >
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-xl shrink-0">
                {profile.statusEmoji || <Smile className="w-5 h-5 text-primary" />}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-black uppercase text-primary tracking-widest mb-0.5">Текущий статус</span>
                <span className="text-sm text-white truncate font-medium">{profile.statusText}</span>
              </div>
            </div>
          )}

          {/* Invite Block */}
          <div 
            onClick={handleInvite}
            className="bg-[#1c1c1e] p-4 rounded-2xl flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all border border-white/5"
          >
            <div className="h-10 w-10 rounded-full bg-[#5856d6]/20 flex items-center justify-center shadow-lg">
              <Link className="w-5 h-5 text-[#5856d6]" />
            </div>
            <span className="text-[#5856d6] font-bold text-[16px]">Приглашить друзей</span>
          </div>

          {/* Main Settings Block */}
          <div className="bg-[#1c1c1e] rounded-[2rem] overflow-hidden divide-y divide-white/[0.05] border border-white/5">
            <SettingsItem 
              icon={Bell} 
              label="Уведомления и звук" 
              color="text-white" 
              onClick={() => openSettings('appearance')}
            />
            <SettingsItem 
              icon={Lock} 
              label="Безопасность" 
              color="text-white" 
              onClick={() => openSettings('security')}
            />
            <SettingsItem 
              icon={MessageSquare} 
              label="Сообщения" 
              color="text-white" 
              onClick={() => openSettings('appearance')}
            />
            <SettingsItem 
              icon={Bookmark} 
              label="Избранное" 
              color="text-white" 
              onClick={openSavedMessages}
            />
          </div>

          <div className="pt-2">
            <p className="text-[11px] text-muted-foreground/40 uppercase font-black text-center tracking-[0.2em] animate-pulse">
              Nuxus Core v0.55.0
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function SettingsItem({ icon: Icon, label, color, onClick }: { icon: any, label: string, color: string, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] active:bg-white/[0.05] transition-colors group"
    >
      <div className="flex items-center gap-4">
        <Icon className={cn("w-6 h-6", color, "opacity-70 group-hover:opacity-100 transition-opacity")} />
        <span className="text-white text-[16px] font-medium">{label}</span>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground/30" />
    </div>
  );
}
