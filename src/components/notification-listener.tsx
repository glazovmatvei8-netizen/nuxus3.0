
"use client"

import { useEffect, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collectionGroup, query, where, onSnapshot, limit } from 'firebase/firestore';
import { useAppState } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';

/**
 * Handles system notifications and sound alerts for incoming messages.
 * Optimized to avoid complex index requirements.
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
    // Initialize notification sound (Premium Nuxus Alert)
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    
    // Request notification permission
    const requestPermission = async () => {
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        } else if (Notification.permission === 'denied') {
          console.warn("Notifications are blocked by user");
        }
      }
    };
    requestPermission();
  }, []);

  useEffect(() => {
    if (!db || !user) return;

    // Simplified query to avoid "Missing Index" errors
    // We listen for messages newer than when the app started
    const q = query(
      collectionGroup(db, 'messages'),
      where('sentAt', '>', startTime.current),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const msg = change.doc.data();
          
          // Ignore own messages or already processed
          if (msg.senderId === user.uid || lastProcessedMessageId.current === change.doc.id) return;
          lastProcessedMessageId.current = change.doc.id;

          // Only notify if chat is not currently open
          if (msg.chatId !== currentChatId) {
            // Play Sound
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(() => {});
            }

            // Show Browser Notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`Nuxus: ${msg.senderName}`, {
                body: msg.contentType === 'text' ? msg.content : `Отправил ${msg.contentType}`,
                icon: 'https://picsum.photos/seed/nuxus/192/192'
              });
            }

            // Show Toast
            toast({
              title: msg.senderName,
              description: msg.contentType === 'text' ? msg.content : `Отправил ${msg.contentType}`,
            });
          }
        }
      });
    }, (error) => {
      // Gracefully handle index errors or permission issues
      if (error.code === 'failed-precondition') {
        console.warn("Notification index is still building or missing. Background notifications may be limited.");
      } else {
        console.error("Notification listener error:", error);
      }
    });

    return () => unsubscribe();
  }, [db, user, currentChatId, toast]);

  return null;
}
