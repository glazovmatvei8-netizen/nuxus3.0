
"use client"

import React from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  QrCode, Pencil, Link, Bell, Lock, Smartphone, 
  MessageSquare, Bookmark, Folder, Battery, HardDrive, 
  ChevronRight, Star
} from 'lucide-react';
import { useAppState } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { formatDisplayName, cn } from '@/lib/utils';
import type { User } from '@/lib/types';

export default function ProfileView() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userProfileRef);

  const handleInvite = () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}?ref=${user?.uid}` : '';
    navigator.clipboard.writeText(url);
    toast({ title: "Ссылка скопирована" });
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-center justify-between shrink-0">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/5 rounded-xl">
          <QrCode className="w-6 h-6" />
        </Button>
        
        <div className="flex items-center gap-2">
          <UserAvatar userId={user?.uid} className="h-8 w-8" />
          <span className="font-bold text-white text-[17px]">
            {formatDisplayName(profile?.name)}
          </span>
        </div>

        <Button variant="ghost" size="icon" className="text-white hover:bg-white/5 rounded-xl">
          <Pencil className="w-6 h-6" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 space-y-4 pb-24">
          
          {/* Invite Block */}
          <div 
            onClick={handleInvite}
            className="bg-[#1c1c1e] p-4 rounded-2xl flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all"
          >
            <div className="h-10 w-10 rounded-full bg-[#5856d6]/20 flex items-center justify-center">
              <Link className="w-5 h-5 text-[#5856d6]" />
            </div>
            <span className="text-[#5856d6] font-semibold text-[16px]">Пригласить друзей</span>
          </div>

          {/* Main Settings Block */}
          <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden divide-y divide-white/[0.05]">
            <SettingsItem icon={Bell} label="Уведомления и звук" color="text-white" />
            <SettingsItem icon={Lock} label="Безопасность" color="text-white" />
            <SettingsItem icon={Smartphone} label="Устройства" color="text-white" />
            <SettingsItem icon={MessageSquare} label="Сообщения" color="text-white" />
            <SettingsItem icon={Bookmark} label="Избранное" color="text-white" />
            <SettingsItem icon={Folder} label="Папки" color="text-white" />
          </div>

          {/* System Settings Block */}
          <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden divide-y divide-white/[0.05]">
            <SettingsItem icon={Battery} label="Экономия батареи и сети" color="text-white" />
            <SettingsItem icon={HardDrive} label="Память" color="text-white" />
          </div>

          {/* Support/Info */}
          <div className="pt-2">
            <p className="text-[11px] text-muted-foreground/40 uppercase font-black text-center tracking-[0.2em]">
              Nuxus Core v27.2.0
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function SettingsItem({ icon: Icon, label, color }: { icon: any, label: string, color: string }) {
  return (
    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] active:bg-white/[0.05] transition-colors group">
      <div className="flex items-center gap-4">
        <Icon className={cn("w-6 h-6", color, "opacity-70 group-hover:opacity-100 transition-opacity")} />
        <span className="text-white text-[16px] font-medium">{label}</span>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground/30" />
    </div>
  );
}
