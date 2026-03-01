
"use client"

import { useEffect, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collectionGroup, query, where, onSnapshot } from 'firebase/firestore';
import { useAppState } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';

/**
 * Handles system notifications and sound alerts for incoming messages.
 * Optimized for maximum speed and correct "before read" logic.
 */
export function NotificationListener() {
  const { user } = useUser();
  const db = useFirestore();
  const { currentChatId } = useAppState();
  const { toast } = useToast();
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastProcessedMessageId = useRef<string | null>(null);
  // Set start time 5 seconds in the past to catch very recent messages on reload
  const startTime = useRef(new Date(Date.now() - 5000).toISOString());
  
  // Use a ref for currentChatId to access it inside the snapshot callback without resubscribing
  const activeChatIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeChatIdRef.current = currentChatId;
  }, [currentChatId]);

  // Classic notification sound
  const NOTIFICATION_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3';

  useEffect(() => {
    // Initialize notification sound
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.preload = 'auto';
    
    // Auto-request on mount if not determined
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Unlock audio context on first interaction
    const unlockAudio = () => {
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          audioRef.current!.currentTime = 0;
        }).catch(() => {});
      }
      window.removeEventListener('mousedown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    
    window.addEventListener('mousedown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    return () => {
      window.removeEventListener('mousedown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (!db || !user) return;

    // Hyper-fast global message listener
    // We filter by 'sentAt' to only get NEW messages arrived during this session
    const q = query(
      collectionGroup(db, 'messages'),
      where('sentAt', '>', startTime.current)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        // We only care about NEWLY ADDED messages that are UNREAD
        if (change.type === 'added') {
          const msg = change.doc.data();
          
          // 1. Skip my own messages
          // 2. Skip already processed IDs
          if (msg.senderId === user.uid || lastProcessedMessageId.current === change.doc.id) return;
          
          lastProcessedMessageId.current = change.doc.id;

          // 3. ONLY notify if NOT in the current active chat
          if (msg.chatId !== activeChatIdRef.current) {
            // Play notification sound
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(e => {
                console.warn("Audio play blocked. Interaction required.", e);
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
  }, [db, user, toast]);

  return null;
}
