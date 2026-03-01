
"use client"

import { useEffect, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collectionGroup, query, where, onSnapshot, limit } from 'firebase/firestore';
import { useAppState } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';

/**
 * Handles system notifications and sound alerts for incoming messages.
 * Updated with custom spinner sound and improved audio unlocking.
 */
export function NotificationListener() {
  const { user } = useUser();
  const db = useFirestore();
  const { currentChatId } = useAppState();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastProcessedMessageId = useRef<string | null>(null);
  const startTime = useRef(new Date().toISOString());

  // Custom sound URL provided by user
  const NOTIFICATION_SOUND = 'https://zvukitop.com/wp-content/uploads/2021/01/vrashenie-kak-spiner.mp3';

  useEffect(() => {
    // Initialize notification sound
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.preload = 'auto';
    
    // Auto-request on mount if not determined
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // CRITICAL: Workaround for browsers that block audio without user gesture
    // We unlock audio on the very first interaction with the app
    const unlockAudio = () => {
      if (audioRef.current) {
        // Play and immediately pause to "unlock" the audio context
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          audioRef.current!.currentTime = 0;
        }).catch(() => {});
      }
      // Remove listeners after first successful interaction
      window.removeEventListener('mousedown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('scroll', unlockAudio);
    };
    
    window.addEventListener('mousedown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('scroll', unlockAudio);

    return () => {
      window.removeEventListener('mousedown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('scroll', unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (!db || !user) return;

    // Listen to all messages globally
    const q = query(
      collectionGroup(db, 'messages'),
      where('sentAt', '>', startTime.current),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const msg = change.doc.data();
          
          // Skip our own messages or already processed ones
          if (msg.senderId === user.uid || lastProcessedMessageId.current === change.doc.id) return;
          lastProcessedMessageId.current = change.doc.id;

          // Notification logic: fire if not in the current active chat
          if (msg.chatId !== currentChatId) {
            // Play custom notification sound
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(e => {
                console.warn("Audio play blocked. User interaction required.", e);
              });
            }

            // Show system notification
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(`${msg.senderName}`, {
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
      console.warn("Notification stream limited:", error.message);
    });

    return () => unsubscribe();
  }, [db, user, currentChatId, toast]);

  return null;
}
