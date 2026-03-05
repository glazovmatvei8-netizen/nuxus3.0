
"use client"

import React from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, query, collection, where, limit, getDocs, addDoc } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  QrCode, Pencil, Bell, Lock, Bookmark, ChevronRight, Star
} from 'lucide-react';
import { useAppState } from '@/lib/store';
import { formatDisplayName, cn, isUserPremium } from '@/lib/utils';
import type { User } from '@/lib/types';

export default function ProfileView() {
  const { user } = useUser();
  const db = useFirestore();
  const { setIsSettingsOpen, setSettingsTab, setCurrentChatId, setActiveView } = useAppState();
  
  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userProfileRef);

  const openSavedMessages = async () => {
    if (!db || !user) return;
    try {
      const q = query(collection(db, 'chats'), where('type', '==', 'saved'), where('participantIds', 'array-contains', user.uid), limit(1));
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

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] overflow-hidden">
      <div className="px-4 pt-6 pb-4 flex items-center justify-between shrink-0">
        <Button variant="ghost" size="icon" className="text-white"><QrCode className="w-6 h-6" /></Button>
        <div className="flex items-center gap-2">
          <UserAvatar userId={user?.uid} className="h-8 w-8" />
          <span className="font-bold text-white text-[17px] flex items-center gap-1.5">{formatDisplayName(profile?.name)} {isUserPremium(profile) && <Star className="w-3.5 h-3.5 text-accent fill-accent" />}</span>
        </div>
        <Button variant="ghost" size="icon" className="text-white" onClick={() => { setSettingsTab('profile'); setIsSettingsOpen(true); }}><Pencil className="w-6 h-6" /></Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 space-y-4 pb-24">
          <div className="bg-[#1c1c1e] rounded-[2rem] overflow-hidden divide-y divide-white/[0.05] border border-white/5">
            <SettingsItem icon={Bell} label="Уведомления" color="text-white" onClick={() => { setSettingsTab('appearance'); setIsSettingsOpen(true); }} />
            <SettingsItem icon={Lock} label="Безопасность" color="text-white" onClick={() => { setSettingsTab('security'); setIsSettingsOpen(true); }} />
            <SettingsItem icon={Bookmark} label="Избранное" color="text-white" onClick={openSavedMessages} />
          </div>

          <div className="pt-2">
            <p className="text-[11px] text-muted-foreground/40 uppercase font-black text-center tracking-[0.2em]">Nuxus Core v0.57.0</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function SettingsItem({ icon: Icon, label, color, onClick }: { icon: any, label: string, color: string, onClick?: () => void }) {
  return (
    <div onClick={onClick} className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] transition-colors group">
      <div className="flex items-center gap-4">
        <Icon className={cn("w-6 h-6", color, "opacity-70 group-hover:opacity-100")} />
        <span className="text-white text-[16px] font-medium">{label}</span>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground/30" />
    </div>
  );
}
