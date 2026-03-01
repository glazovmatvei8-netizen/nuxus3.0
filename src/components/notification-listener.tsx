
"use client"

import { useEffect, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collectionGroup, query, where, onSnapshot, limit } from 'firebase/firestore';
import { useAppState } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';

/**
 * Handles system notifications and sound alerts for incoming messages.
 * Optimized to be proactive with permission requests and audio unlocking.
 */
export function NotificationListener() {
  const { user } = useUser();
  const db = useFirestore();
  const { currentChatId } = useAppState();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastProcessedMessageId = useRef<string | null>(null);
  const startTime = useRef(new Date().toISOString());

  useEffect(() => {
    // Initialize notification sound
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    
    // Auto-request on mount if not determined
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // CRITICAL: Workaround for browsers that block audio without user gesture
    // We unlock audio on the very first interaction with the app
    const unlockAudio = () => {
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          audioRef.current!.currentTime = 0;
        }).catch(() => {});
      }
      window.removeEventListener('mousedown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    
    window.addEventListener('mousedown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    return () => {
      window.removeEventListener('mousedown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (!db || !user) return;

    // We listen to all messages globally to catch notifications for other chats
    const q = query(
      collectionGroup(db, 'messages'),
      where('sentAt', '>', startTime.current),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const msg = change.doc.data();
          
          // Skip our own messages or already processed ones
          if (msg.senderId === user.uid || lastProcessedMessageId.current === change.doc.id) return;
          lastProcessedMessageId.current = change.doc.id;

          // Sound should play if notification is allowed and app is visible but chat is NOT current
          if (msg.chatId !== currentChatId) {
            // Play notification sound
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(e => console.warn("Audio play blocked by browser policies. Interaction required."));
            }

            // Show system notification
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(`Nuxus: ${msg.senderName}`, {
                  body: msg.contentType === 'text' ? msg.content : `Отправил ${msg.contentType}`,
                  icon: 'https://picsum.photos/seed/nuxus/192/192'
                });
              } catch (e) {}
            }

            // Show in-app toast
            toast({
              title: msg.senderName,
              description: msg.contentType === 'text' ? msg.content : `Отправил ${msg.contentType}`,
            });
          }
        }
      });
    }, (error) => {
      // Index errors handled gracefully
      console.warn("Notification stream limited (index required?):", error.message);
    });

    return () => unsubscribe();
  }, [db, user, currentChatId, toast]);

  return null;
}
