
"use client"

import { useEffect, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collectionGroup, query, where, onSnapshot } from 'firebase/firestore';
import { useAppState } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';

/**
 * Handles system notifications and sound alerts for incoming messages.
 * Optimized for instant response and "before read" logic.
 */
export function NotificationListener() {
  const { user } = useUser();
  const db = useFirestore();
  const { currentChatId } = useAppState();
  const { toast } = useToast();
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastProcessedMessageId = useRef<string | null>(null);
  // Track the start time to only notify about NEW messages
  const startTime = useRef(new Date().toISOString());
  
  // Ref for activeChatId to check without re-running effect
  const activeChatIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeChatIdRef.current = currentChatId;
  }, [currentChatId]);

  // Spinner notification sound from user
  const NOTIFICATION_SOUND = 'https://zvukitop.com/wp-content/uploads/2021/01/vrashenie-kak-spiner.mp3';

  useEffect(() => {
    // Initialize notification sound
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.preload = 'auto';
    
    // Auto-request permission on mount
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Critical: Unlock audio context on any user interaction
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

    // Fast global message listener for ALL messages
    // Note: This requires an index if used with collectionGroup + where
    // We use a broader query if index is not ready
    const q = query(
      collectionGroup(db, 'messages'),
      where('sentAt', '>', startTime.current)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const msg = change.doc.data();
          
          // 1. Skip my own messages
          // 2. Skip already processed IDs
          if (msg.senderId === user.uid || lastProcessedMessageId.current === change.doc.id) return;
          
          lastProcessedMessageId.current = change.doc.id;

          // 3. Notify ONLY if NOT in the current active chat
          // This logic ensures you hear sound even if you haven't "read" the message yet
          if (msg.chatId !== activeChatIdRef.current) {
            // Instant sound feedback
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(e => {
                // Silently handle if audio is still blocked
              });
            }

            // System Push Notification
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(`${msg.senderName}`, {
                  body: msg.contentType === 'text' ? msg.content : `Отправил ${msg.contentType}`,
                  icon: 'https://picsum.photos/seed/nuxus/192/192'
                });
              } catch (e) {}
            }

            // In-app visual toast
            toast({
              title: msg.senderName,
              description: msg.contentType === 'text' ? msg.content : `Отправил ${msg.contentType}`,
            });
          }
        }
      });
    }, (error) => {
      // Indexing error or permission error handled silently here to avoid UI crash
      console.warn("Notification listener hint:", error.message);
    });

    return () => unsubscribe();
  }, [db, user, toast]);

  return null;
}
