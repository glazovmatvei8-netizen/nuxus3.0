
"use client"

import { useEffect, useRef } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAppState } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import type { Chat, Message } from '@/lib/types';

/**
 * Handles system notifications and sound alerts for incoming messages.
 * Uses chat-based tracking to avoid complex collectionGroup indexes.
 */
export function NotificationListener() {
  const { user } = useUser();
  const db = useFirestore();
  const { currentChatId } = useAppState();
  const { toast } = useToast();
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastProcessedTimestamps = useRef<Record<string, string>>({});
  const isFirstLoad = useRef(true);

  // Default Nuxus clean pop sound
  const NOTIFICATION_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3';

  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.preload = 'auto';
    
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const unlockAudio = () => {
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          audioRef.current!.currentTime = 0;
        }).catch(() => {});
      }
      window.removeEventListener('pointerdown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio);
    return () => window.removeEventListener('pointerdown', unlockAudio);
  }, []);

  // Listen to CHATS where user is participant to detect new activity
  const chatsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid));
  }, [db, user]);

  useEffect(() => {
    if (!db || !user || !chatsQuery) return;

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
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

            // Only notify if:
            // 1. Not current open chat
            // 2. Not the first load of the app
            if (chatId !== currentChatId && !isFirstLoad.current) {
              // Fetch the actual message content for the notification
              try {
                const msgSnap = await getDocs(query(
                  collection(db, 'chats', chatId, 'messages'),
                  orderBy('sentAt', 'desc'),
                  limit(1)
                ));

                if (!msgSnap.empty) {
                  const msg = msgSnap.docs[0].data() as Message;
                  
                  // Don't notify about our own messages
                  if (msg.senderId === user.uid) return;

                  // Play sound
                  if (audioRef.current) {
                    audioRef.current.currentTime = 0;
                    audioRef.current.play().catch(() => {});
                  }

                  // System Notification
                  if (Notification.permission === 'granted') {
                    new Notification(msg.senderName || 'Новое сообщение', {
                      body: msg.contentType === 'text' ? msg.content : `Отправил ${msg.contentType}`,
                      icon: '/icon.png'
                    });
                  }

                  // In-app Toast
                  toast({
                    title: msg.senderName,
                    description: msg.contentType === 'text' ? msg.content : `Прислал ${msg.contentType}`,
                  });
                }
              } catch (e) {
                console.error("Notification fetch error:", e);
              }
            }
          }
        }
      });
      
      if (isFirstLoad.current) isFirstLoad.current = false;
    });

    return () => unsubscribe();
  }, [db, user, chatsQuery, currentChatId, toast]);

  return null;
}
