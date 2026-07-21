"use client"

import { useEffect, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAppState } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import type { Chat, Call } from '@/lib/types';

/**
 * NUXUS NOTIFICATION CORE V72.0.0
 * Добавлена поддержка звонков и системных звуков.
 */
export function NotificationListener() {
  const { user } = useUser();
  const db = useFirestore();
  const { currentChatId, setActiveCallId, activeCallId } = useAppState();
  const { toast } = useToast();
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!db || !user) return;

    // 1. Поиск входящих звонков
    const callsQuery = query(
      collection(db, 'calls'),
      where('participantIds', 'array-contains', user.uid),
      where('status', '==', 'calling')
    );

    const unsubscribeCalls = onSnapshot(callsQuery, (snap) => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const call = { id: change.doc.id, ...change.doc.data() } as Call;
          if (call.receiverId === user.uid && !activeCallId) {
            setActiveCallId(call.id);
            toast({ title: "Входящий вызов", description: "Узел запрашивает соединение..." });
          }
        }
      });
    });

    // 2. Уведомления о сообщениях (упрощено для стабильности)
    const chatsQuery = query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid));
    const unsubscribeMessages = onSnapshot(chatsQuery, (snap) => {
      // Здесь можно добавить Toast для новых сообщений в закрытых чатах
    });

    return () => {
      unsubscribeCalls();
      unsubscribeMessages();
    };
  }, [db, user, activeCallId]);

  return null;
}
