
"use client"

import { useEffect, useRef } from 'react';
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs, doc } from 'firebase/firestore';
import { useAppState } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import type { Chat, Message, User } from '@/lib/types';
import { isAfter, parseISO } from 'date-fns';

/**
 * Гипер-звуковое Ядро Уведомлений Nuxus v50.0.0.
 * Теперь учитывает настройки уведомлений пользователя и индивидуальный Mute чата.
 */
export function NotificationListener() {
  const { user } = useUser();
  const db = useFirestore();
  const { currentChatId } = useAppState();
  const { toast } = useToast();
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastProcessedTimestamps = useRef<Record<string, string>>({});
  const isFirstLoad = useRef(true);

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);

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
    if (!db || !user || !chatsQuery || !profile) return;

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

            if (newTime && newTime !== lastTime) {
              lastProcessedTimestamps.current[chatId] = newTime;

              if (chatId !== currentChatId && !isFirstLoad.current) {
                
                // --- ПРОВЕРКА MUTE ЧАТА ---
                const userMuteTimestamp = chatData.metadata?.[user.uid]?.mutedUntil;
                if (userMuteTimestamp) {
                  try {
                    if (isAfter(parseISO(userMuteTimestamp), new Date())) {
                      return; // Чат приглушен, выходим
                    }
                  } catch (e) {
                    console.error("Mute check error:", e);
                  }
                }

                // Проверка глобальных настроек уведомлений
                const notifSettings = profile.settings?.notifications;
                let shouldNotify = true;

                if (notifSettings) {
                  if (chatData.type === 'private' && notifSettings.messages === false) shouldNotify = false;
                  if (chatData.type === 'group' && notifSettings.groups === false) shouldNotify = false;
                  if (chatData.type === 'channel' && notifSettings.channels === false) shouldNotify = false;
                }

                if (!shouldNotify) return;

                // МГНОВЕННЫЙ ЗВУК
                if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                  audioRef.current.play().catch(() => {});
                }

                try {
                  const msgSnap = await getDocs(query(
                    collection(db, 'chats', chatId, 'messages'),
                    orderBy('sentAt', 'desc'),
                    limit(1)
                  ));

                  if (!msgSnap.empty) {
                    const msg = msgSnap.docs[0].data() as Message;
                    if (msg.senderId === user.uid) return;

                    const showPreview = profile.settings?.notifications?.previews !== false;
                    const displayContent = showPreview 
                      ? (msg.contentType === 'text' ? msg.content : `[${msg.contentType}]`)
                      : 'Новое сообщение';

                    // Системный пуш
                    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                      try {
                        new Notification(msg.senderName || 'Nuxus', {
                          body: displayContent,
                          icon: 'https://picsum.photos/seed/nuxus/192/192',
                          tag: chatId
                        });
                      } catch (e) {}
                    }

                    // Внутреннее уведомление
                    toast({
                      title: msg.senderName,
                      description: displayContent,
                    });
                  }
                } catch (e) {}
              }
            }
          }
        });
        
        if (isFirstLoad.current) isFirstLoad.current = false;
      }, (error) => {
        console.warn("Notification stream wait:", error.message);
      });
    } catch (e) {}

    return () => unsubscribe && unsubscribe();
  }, [db, user, chatsQuery, currentChatId, toast, profile]);

  return null;
}
