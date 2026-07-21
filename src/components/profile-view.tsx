
"use client"

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, query, collection, limit, writeBatch, increment } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Pencil, Bookmark, ChevronRight, Star, Share2, Zap, HelpCircle, Globe, Server, QrCode, Fingerprint, Cpu, Shield, ShieldCheck, Palette, Sparkles, Gift, Trash2, Clock, Gem, ArrowRightLeft, Loader2, Download, CheckCircle2, Phone, Mail
} from 'lucide-react';
import { useAppState } from '@/lib/store';
import { formatDisplayName, cn, isUserPremium } from '@/lib/utils';
import type { User, ReceivedGift } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import nuxusVersions from '@/app/versions.json';
import { differenceInDays, parseISO, format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { TradeModal } from './modals/trade-modal';
import Link from 'next/link';

export default function ProfileView() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { setIsSettingsOpen, setSettingsTab, setIsLegalOpen } = useAppState();
  
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [selectedGift, setSelectedGift] = useState<ReceivedGift | null>(null);
  const [isSelling, setIsSelling] = useState(false);
  const [isTradeOpen, setIsTradeOpen] = useState(false);
  
  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db!, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userProfileRef);

  const giftsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users', user.uid, 'receivedGifts'), limit(24));
  }, [db, user]);
  const { data: gifts } = useCollection<ReceivedGift>(giftsQuery);

  const inviteLink = useMemo(() => {
    if (typeof window === 'undefined' || !user) return '';
    return `${window.location.origin}/?ref=${user.uid}`;
  }, [user]);

  const copyRefLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    toast({ title: "Ссылка скопирована", description: "Идентификатор узла готов к передаче." });
  };

  const handleSellGift = async () => {
    if (!db || !user || !selectedGift || !profile) return;
    setIsSelling(true);
    try {
      const batch = writeBatch(db);
      const refundRate = 0.65;
      const refundAmount = Math.floor(selectedGift.price * refundRate);
      const userRef = doc(db, 'users', user.uid);
      const giftRef = doc(db, 'users', user.uid, 'receivedGifts', selectedGift.id);
      const txRef = doc(collection(db, 'users', user.uid, 'transactions'));
      batch.update(userRef, { balance: increment(refundAmount) });
      batch.delete(giftRef);
      batch.set(txRef, {
        id: txRef.id, userId: user.uid, amount: refundAmount, type: 'transfer_in', status: 'completed', otherPartyName: `Buyback: ${selectedGift.giftName}`, createdAt: new Date().toISOString()
      });
      await batch.commit();
      toast({ title: "Артефакт продан", description: `Начислено ${refundAmount} NX` });
      setSelectedGift(null);
    } catch (e) { toast({ title: "Ошибка", variant: "destructive" }); }
    finally { setIsSelling(false); }
  };

  const isPremium = isUserPremium(profile);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden relative">
      <div className="px-6 pt-10 pb-4 flex items-center justify-between shrink-0 relative z-30">
        <Button variant="ghost" size="icon" className="obsidian-glass h-10 w-10 rounded-xl text-white/60 hover:text-primary transition-all" onClick={copyRefLink}>
          <Share2 className="w-5 h-5" />
        </Button>
        <div className="flex flex-col items-center">
           <span className="text-[8px] font-black uppercase text-primary/40 tracking-[0.5em] ml-[0.5em]">V5.8.0 ALPHA</span>
        </div>
        <Button variant="ghost" size="icon" className="obsidian-glass h-10 w-10 rounded-xl text-white/60 hover:text-primary transition-all" onClick={() => { setSettingsTab('profile'); setIsSettingsOpen(true); }}>
          <Pencil className="w-5 h-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 relative z-10">
        <div className="px-6 space-y-4 pb-32 pt-2 animate-in fade-in duration-700">
          
          <div className="flex flex-col items-center gap-4 mb-4 pt-4">
             <div className="relative group">
                <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                <UserAvatar userId={user?.uid} className={cn("h-32 w-32 border-4 obsidian-glass transition-all duration-700 shadow-2xl relative z-10", isPremium ? "border-primary/40" : "border-white/5")} showOnlineStatus />
             </div>
             <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-2">
                   <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-tight">
                     {profile?.name ? formatDisplayName(profile.name) : 'СИНХРОНИЗАЦИЯ...'}
                   </h2>
                   {isPremium && <Star className="w-5 h-5 text-accent fill-accent animate-pulse" />}
                   {profile?.vkId && <div className="bg-blue-500 rounded-full p-1"><CheckCircle2 className="w-3 h-3 text-white" /></div>}
                </div>
                <div className="flex items-center justify-center gap-3">
                   <span className="text-[11px] text-primary/60 font-black uppercase tracking-[0.4em] italic ml-[0.4em]">{profile?.username}</span>
                   {profile?.phone && <Phone className="w-3 h-3 text-green-500" />}
                   {profile?.email && <Mail className="w-3 h-3 text-blue-400" />}
                </div>
             </div>

             {profile?.statusText && (
                <div className="mt-2 px-6 py-2.5 bg-white/[0.03] rounded-2xl border border-white/5 inline-flex items-center gap-3 animate-in fade-in zoom-in-95 duration-500 shadow-lg">
                   <Sparkles className="w-4 h-4 text-accent animate-pulse" />
                   <span className="text-[11px] font-black text-white/90 uppercase tracking-widest leading-none">{profile.statusText}</span>
                </div>
             )}
          </div>

          {gifts && gifts.length > 0 && (
             <div className="obsidian-glass p-6 rounded-[2rem] border-white/5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2 text-accent">
                      <Gift className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Моя коллекция</span>
                   </div>
                   <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{gifts.length} Артефактов</span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                   {gifts.map(gift => (
                      <div 
                        key={gift.id} 
                        onClick={() => setSelectedGift(gift)}
                        className="aspect-square bg-white/5 rounded-2xl border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all group shadow-inner cursor-pointer relative"
                      >
                         <span className="text-3xl group-hover:scale-125 transition-transform duration-500 drop-shadow-xl">{gift.giftIcon}</span>
                         {(gift as any).isNft && <Gem className="absolute top-1 right-1 w-2.5 h-2.5 text-accent animate-pulse" />}
                      </div>
                   ))}
                </div>
             </div>
          )}

          <div className="obsidian-glass p-6 rounded-[2rem] space-y-5 relative overflow-hidden group border-white/5 shadow-xl">
             <div className="flex items-center justify-between relative z-10 text-left">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/10">
                    <Cpu className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase text-primary/50 tracking-widest leading-none">Протокол Ядра</span>
                    <span className="text-xl font-black text-white italic mt-1 tracking-tighter uppercase">Узел V5.8.0</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-white italic tabular-nums">{profile?.referralCount || 0}</span>
                  <span className="text-[8px] font-black text-primary/40 uppercase block tracking-widest">Связи</span>
                </div>
             </div>
             <div className="h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-accent shadow-[0_0_10px_rgba(168,85,247,0.8)] transition-all duration-1500" style={{ width: `${Math.min(100, ((profile?.referralCount || 0) / 10) * 100)}%` }} />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ActionCard icon={QrCode} label="Signal QR" sub="ИДЕНТИФИКАЦИЯ" accent="text-accent" onClick={() => setIsQrOpen(true)} />
            <Link href="/download" className="block w-full">
              <ActionCard icon={Download} label="APK Client" sub="СКАЧАТЬ ЯДРО" accent="text-primary" />
            </Link>
          </div>

          <div className="obsidian-glass rounded-[2rem] overflow-hidden divide-y divide-white/[0.03] border-white/5 shadow-xl">
            <ProfileItem icon={Fingerprint} label="Безопасность" color="text-primary" onClick={() => { setSettingsTab('privacy'); setIsSettingsOpen(true); }} />
            <ProfileItem icon={Palette} label="Стиль и Цвет" color="text-white/60" onClick={() => { setSettingsTab('style'); setIsSettingsOpen(true); }} />
            <ProfileItem icon={Bookmark} label="Архив Данных" color="text-white/60" onClick={() => { setSettingsTab('data'); setIsSettingsOpen(true); }} />
            <ProfileItem icon={HelpCircle} label="Интеллект Ядра" color="text-white/60" onClick={() => setIsLegalOpen(true)} />
          </div>

          <div className="py-8 flex flex-col items-center gap-4 opacity-20">
             <p className="text-[8px] text-white uppercase font-black tracking-widest">Синхронизировано V{nuxusVersions.latestVersion}</p>
          </div>
        </div>
      </ScrollArea>

      {/* GIFT MODAL */}
      <Dialog open={!!selectedGift} onOpenChange={(o) => !o && setSelectedGift(null)}>
        <DialogContent className="max-w-xs bg-card border-white/10 rounded-[2.5rem] p-8 text-center shadow-2xl outline-none">
          {selectedGift && (
            <>
              <DialogHeader><DialogTitle className="text-xl font-black uppercase italic text-white text-center w-full">Артефакт Ядра</DialogTitle></DialogHeader>
              <div className="py-8 flex flex-col items-center gap-4">
                <div className="text-7xl mb-2 drop-shadow-2xl animate-pulse">{selectedGift.giftIcon}</div>
                <h3 className="text-lg font-black text-white uppercase italic">{selectedGift.giftName}</h3>
              </div>
              <div className="space-y-3 w-full">
                <Button disabled={isSelling} onClick={handleSellGift} className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl">
                  {isSelling ? <Loader2 className="animate-spin w-5 h-5" /> : `Продать за ${Math.floor(selectedGift.price * 0.65)} NX`}
                </Button>
                <Button onClick={() => setIsTradeOpen(true)} variant="outline" className="w-full h-14 border-white/10 bg-white/5 text-white rounded-2xl font-black uppercase italic tracking-widest gap-2 shadow-lg">
                  <ArrowRightLeft className="w-4 h-4 text-accent" /> Передать
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="max-w-xs obsidian-glass border-white/10 rounded-[2.5rem] p-8 text-center shadow-2xl outline-none">
          <DialogHeader><DialogTitle className="text-xl font-black uppercase italic text-white text-center w-full">Signal Hash</DialogTitle></DialogHeader>
          <div className="py-4 flex justify-center">
            <div className="bg-white p-5 rounded-[2rem] shadow-xl relative">
              <QRCodeSVG value={inviteLink} size={140} imageSettings={{ src: "https://i.ibb.co/sd2MqGz2/Icon.png", height: 32, width: 32, excavate: true }} />
            </div>
          </div>
          <Button variant="ghost" onClick={() => setIsQrOpen(false)} className="mt-6 w-full h-12 rounded-xl text-[9px] font-black uppercase tracking-widest text-primary">Закрыть</Button>
        </DialogContent>
      </Dialog>

      <TradeModal open={isTradeOpen} onOpenChange={setIsTradeOpen} gift={selectedGift} />
    </div>
  );
}

function ActionCard({ icon: Icon, label, sub, accent, onClick }: any) {
  return (
    <div onClick={onClick} className="obsidian-glass border-white/5 p-4 rounded-3xl flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-lg hover:bg-white/5 group h-full">
      <Icon className={cn("w-6 h-6 mb-0.5 transition-transform duration-500 group-hover:scale-110", accent)} />
      <span className="text-[14px] font-black text-white italic tracking-tighter uppercase">{label}</span>
      <span className="text-[7px] uppercase font-black text-white/20 tracking-widest">{sub}</span>
    </div>
  );
}

function ProfileItem({ icon: Icon, label, color, onClick }: any) {
  return (
    <div onClick={onClick} className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/[0.02] transition-all group">
      <div className="flex items-center gap-4">
        <div className="bg-white/5 p-2 rounded-lg transition-all group-hover:bg-primary/10">
          <Icon className={cn("w-5 h-5", color, "opacity-60 group-hover:opacity-100")} />
        </div>
        <span className="text-white text-[15px] font-black italic tracking-tight uppercase group-hover:translate-x-0.5 transition-transform">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-white/5 group-hover:text-primary transition-colors" />
    </div>
  );
}
