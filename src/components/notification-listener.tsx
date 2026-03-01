
"use client"

import { useEffect, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collectionGroup, query, where, onSnapshot, limit } from 'firebase/firestore';
import { useAppState } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';

/**
 * Handles system notifications and sound alerts for incoming messages.
 * Optimized to be proactive with permission requests.
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
    
    const requestPermission = async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        // We request permission proactively when the app loads
        await Notification.requestPermission();
      }
    };
    requestPermission();

    // Workaround for some browsers that block audio without user gesture
    const enableAudio = () => {
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          audioRef.current!.currentTime = 0;
        }).catch(() => {});
      }
      window.removeEventListener('click', enableAudio);
    };
    window.addEventListener('click', enableAudio);

    return () => window.removeEventListener('click', enableAudio);
  }, []);

  useEffect(() => {
    if (!db || !user) return;

    // Simplified query to avoid index errors
    const q = query(
      collectionGroup(db, 'messages'),
      where('sentAt', '>', startTime.current),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const msg = change.doc.data();
          
          if (msg.senderId === user.uid || lastProcessedMessageId.current === change.doc.id) return;
          lastProcessedMessageId.current = change.doc.id;

          // Sound should play if notification is allowed and app is visible but chat is wrong
          if (msg.chatId !== currentChatId) {
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(() => {});
            }

            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`Nuxus: ${msg.senderName}`, {
                body: msg.contentType === 'text' ? msg.content : `Отправил ${msg.contentType}`,
                icon: 'https://picsum.photos/seed/nuxus/192/192'
              });
            }

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
