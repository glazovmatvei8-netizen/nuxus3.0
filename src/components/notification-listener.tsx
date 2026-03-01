
"use client"

import { useEffect, useRef } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useAppState } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';

/**
 * Handles system notifications and sound alerts for incoming messages.
 */
export function NotificationListener() {
  const { user } = useUser();
  const db = useFirestore();
  const { currentChatId } = useAppState();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastProcessedMessageId = useRef<string | null>(null);

  useEffect(() => {
    // Initialize notification sound (Premium Nuxus Alert)
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    
    // Request notification permission on mount
    const requestPermission = async () => {
      if ('Notification' in window && Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          toast({ title: "Уведомления включены", description: "Теперь вы не пропустите важные сообщения." });
        }
      }
    };
    requestPermission();
  }, [toast]);

  useEffect(() => {
    if (!db || !user) return;

    // Listen for new messages globally using collectionGroup
    // Note: In production, you'd want to listen only to messages in chats where you are a participant.
    // For MVP, we listen to recent messages.
    const q = query(
      collectionGroup(db, 'messages'),
      where('sentAt', '>', new Date().toISOString()),
      orderBy('sentAt', 'desc'),
      limit(1)
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
                body: msg.contentType === 'text' ? msg.content : `[${msg.contentType}]`,
                icon: 'https://picsum.photos/seed/nuxus/192/192'
              });
            }

            // Show Toast as fallback or addition
            toast({
              title: msg.senderName,
              description: msg.contentType === 'text' ? msg.content : `Отправил ${msg.contentType}`,
            });
          }
        }
      });
    });

    return () => unsubscribe();
  }, [db, user, currentChatId, toast]);

  return null;
}
