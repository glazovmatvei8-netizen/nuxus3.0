
"use client"

import { useEffect, useRef } from 'react';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAppState } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import type { Chat, Message } from '@/lib/types';

/**
 * Гипер-звуковое Ядро Уведомлений Nuxus v22.0.0.
 * Оптимизировано для мгновенного отклика и работы на смартфонах.
 */
export function NotificationListener() {
  const { user } = useUser();
  const db = useFirestore();
  const { currentChatId } = useAppState();
  const { toast } = useToast();
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastProcessedTimestamps = useRef<Record<string, string>>({});
  const isFirstLoad = useRef(true);

  // Классический премиальный звук Nuxus
  const NOTIFICATION_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3';

  useEffect(() => {
    try {
      audioRef.current = new Audio(NOTIFICATION_SOUND);
      audioRef.current.preload = 'auto';
    } catch (e) {
      console.warn("Audio initialization failed:", e);
    }
    
    const initNotifications = async () => {
      // Инициализация аудио-контекста при первом тапе (нужно для мобилок)
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          audioRef.current!.currentTime = 0;
        }).catch(() => {});
      }

      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          try {
            await Notification.requestPermission();
          } catch (e) {}
        }
      }
      window.removeEventListener('pointerdown', initNotifications);
    };

    window.addEventListener('pointerdown', initNotifications);
    return () => window.removeEventListener('pointerdown', initNotifications);
  }, []);

  const chatsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid));
  }, [db, user]);

  useEffect(() => {
    if (!db || !user || !chatsQuery) return;

    let unsubscribe: () => void;
    
    try {
      unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          const chatData = change.doc.data() as Chat;
          const chatId = change.doc.id;

          if (change.type === 'added') {
            if (chatData.lastMessageAt) {
              lastProcessedTimestamps.current[chatId] = chatData.lastMessageAt;
            }
            return;
          }

          if (change.type === 'modified') {
            const lastTime = lastProcessedTimestamps.current[chatId];
            const newTime = chatData.lastMessageAt;

            // Если пришло новое сообщение и этот чат сейчас НЕ открыт
            if (newTime && newTime !== lastTime) {
              lastProcessedTimestamps.current[chatId] = newTime;

              if (chatId !== currentChatId && !isFirstLoad.current) {
                // МГНОВЕННЫЙ ЗВУК (не ждем загрузки сообщения)
                if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                  audioRef.current.play().catch(() => {});
                }

                try {
                  // Подгружаем детали сообщения для пуша и тоста
                  const msgSnap = await getDocs(query(
                    collection(db, 'chats', chatId, 'messages'),
                    orderBy('sentAt', 'desc'),
                    limit(1)
                  ));

                  if (!msgSnap.empty) {
                    const msg = msgSnap.docs[0].data() as Message;
                    if (msg.senderId === user.uid) return;

                    // Системный пуш (для PWA / Standalone)
                    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                      try {
                        new Notification(msg.senderName || 'Nuxus', {
                          body: msg.contentType === 'text' ? msg.content : `[${msg.contentType}]`,
                          icon: 'https://picsum.photos/seed/nuxus/192/192',
                          tag: chatId
                        });
                      } catch (e) {}
                    }

                    // Внутреннее уведомление
                    toast({
                      title: msg.senderName,
                      description: msg.contentType === 'text' ? msg.content : `Прислал ${msg.contentType}`,
                    });
                  }
                } catch (e) {}
              }
            }
          }
        });
        
        if (isFirstLoad.current) isFirstLoad.current = false;
      }, (error) => {
        // Ошибка может возникнуть если индекс еще строится, просто игнорируем
        console.warn("Notification stream wait:", error.message);
      });
    } catch (e) {}

    return () => unsubscribe && unsubscribe();
  }, [db, user, chatsQuery, currentChatId, toast]);

  return null;
}
