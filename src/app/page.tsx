
"use client"

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useAppState } from '@/lib/store';
import AuthScreen from '@/components/auth-screen';
import ChatMain from '@/components/chat-main';
import { Loader2, ShieldAlert } from 'lucide-react';
import { doc, collection, query, where, limit, getDocs, arrayUnion, updateDoc } from 'firebase/firestore';
import type { User as UserType, Chat } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { setCurrentChatId } = useAppState();
  const { toast } = useToast();
  const [isJoining, setIsJoining] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile, isLoading: isProfileLoading } = useDoc<UserType>(userProfileRef);

  // Handle ?join=@username link logic with robust search
  useEffect(() => {
    if (!user || !db || isJoining) return;

    const params = new URLSearchParams(window.location.search);
    const joinParam = params.get('join');

    if (joinParam) {
      const handleJoin = async () => {
        setIsJoining(true);
        try {
          // Normalize username for search (must be lowercase)
          const searchUsername = joinParam.startsWith('@') ? joinParam.toLowerCase() : '@' + joinParam.toLowerCase();
          
          const q = query(
            collection(db, 'chats'), 
            where('username', '==', searchUsername), 
            limit(1)
          );
          
          const snap = await getDocs(q);

          if (!snap.empty) {
            const chatDoc = snap.docs[0];
            const chatData = { id: chatDoc.id, ...chatDoc.data() } as Chat;
            
            if (!chatData.participantIds.includes(user.uid)) {
              await updateDoc(doc(db, 'chats', chatDoc.id), {
                participantIds: arrayUnion(user.uid)
              });
              toast({ title: "Успех", description: `Вы вступили в ${chatData.name}` });
            }
            
            setCurrentChatId(chatDoc.id);
            // Clear URL params without reloading
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            // Try exact match case just in case some old data exists
            const qExact = query(collection(db, 'chats'), where('username', '==', joinParam.startsWith('@') ? joinParam : '@' + joinParam), limit(1));
            const snapExact = await getDocs(qExact);
            
            if (!snapExact.empty) {
              const chatDoc = snapExact.docs[0];
              const chatData = { id: chatDoc.id, ...chatDoc.data() } as Chat;
              if (!chatData.participantIds.includes(user.uid)) {
                await updateDoc(doc(db, 'chats', chatDoc.id), { participantIds: arrayUnion(user.uid) });
              }
              setCurrentChatId(chatDoc.id);
              window.history.replaceState({}, document.title, window.location.pathname);
            } else {
              toast({ title: "Ошибка", description: "Группа не найдена или ник указан неверно", variant: "destructive" });
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }
        } catch (e) {
          console.error("Join error:", e);
          toast({ title: "Ошибка системы", description: "Не удалось обработать ссылку", variant: "destructive" });
        } finally {
          setIsJoining(false);
        }
      };
      handleJoin();
    }
  }, [user, db, setCurrentChatId, toast, isJoining]);

  if (isUserLoading || isJoining) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 animate-pulse">
            {isJoining ? "Вход в сообщество..." : "Загрузка Ядра..."}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (isProfileLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (profile?.isBanned) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="bg-destructive/10 p-6 rounded-full mb-6">
          <ShieldAlert className="w-16 h-16 text-destructive" />
        </div>
        <h1 className="text-3xl font-bold mb-4 text-white">Аккаунт заблокирован</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          Ваш доступ к мессенджеру был ограничен за нарушение правил сообщества.
        </p>
        <Button variant="outline" onClick={() => signOut(auth)}>
          Выйти
        </Button>
      </div>
    );
  }

  return <ChatMain />;
}
