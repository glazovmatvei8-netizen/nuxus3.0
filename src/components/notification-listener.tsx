
"use client"

import { useEffect, useRef } from 'react';
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { useAppState } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import type { Chat, User } from '@/lib/types';
import { isAfter, parseISO } from 'date-fns';

/**
 * Nuxus Notification Core v60.0.0 - Optimized for Mobile.
 * Reduced CPU overhead to prevent device heating.
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

  useEffect(() => {
    // Lazy load audio
    const setupAudio = () => {
      if (!audioRef.current) {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
        audioRef.current.preload = 'auto';
      }
      window.removeEventListener('pointerdown', setupAudio);
    };
    window.addEventListener('pointerdown', setupAudio);
    return () => window.removeEventListener('pointerdown', setupAudio);
  }, []);

  const chatsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid));
  }, [db, user]);

  useEffect(() => {
    if (!db || !user || !chatsQuery || !profile) return;

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
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

            // Only notify if not active chat and not initial load
            if (chatId !== currentChatId && !isFirstLoad.current) {
              
              // Mute check
              const userMuteTimestamp = chatData.metadata?.[user.uid]?.mutedUntil;
              if (userMuteTimestamp && isAfter(parseISO(userMuteTimestamp), new Date())) {
                return;
              }

              // Global settings check
              const notifSettings = profile.settings?.notifications;
              if (notifSettings) {
                if (chatData.type === 'private' && notifSettings.messages === false) return;
                if (chatData.type === 'group' && notifSettings.groups === false) return;
                if (chatData.type === 'channel' && notifSettings.channels === false) return;
              }

              // Play sound
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(() => {});
              }

              // Visual notification
              const senderName = chatData.type === 'private' ? 'Nuxus' : chatData.name;
              toast({
                title: senderName,
                description: 'Новое сообщение',
              });
            }
          }
        }
      });
      
      if (isFirstLoad.current) isFirstLoad.current = false;
    }, (error) => {
      console.warn("Notification stream error:", error.message);
    });

    return () => unsubscribe();
  }, [db, user, chatsQuery, currentChatId, toast, profile]);

  return null;
}
