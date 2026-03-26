
"use client"

import { useEffect, useRef } from 'react';
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, arrayUnion, arrayRemove, addDoc, getDocs, limit } from 'firebase/firestore';
import { useAppState } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import type { Chat, User } from '@/lib/types';
import { decryptSignal, isGlobalAdmin } from '@/lib/utils';
import { isAfter, parseISO, addDays } from 'date-fns';

/**
 * Nuxus Notification & Bot Core v65.5.0
 * Управляет уведомлениями и логикой бота Nuxus Chat Manager.
 */
export function NotificationListener() {
  const { user } = useUser();
  const db = useFirestore();
  const { currentChatId } = useAppState();
  const { toast } = useToast();
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastProcessedTimestamps = useRef<Record<string, string>>({});
  const processedMessageIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);

  useEffect(() => {
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

  // Глобальный слушатель команд бота во всех чатах
  useEffect(() => {
    if (!db || !user || !chatsQuery) return;

    const unsubscribe = onSnapshot(chatsQuery, (chatSnapshot) => {
      chatSnapshot.docs.forEach((chatDoc) => {
        const chatId = chatDoc.id;
        const chatData = chatDoc.data() as Chat;

        // Для каждого чата слушаем новые сообщения
        const msgQuery = query(
          collection(db, 'chats', chatId, 'messages'),
          where('sentAt', '>', new Date(Date.now() - 30000).toISOString()) // Только свежие сообщения за последние 30 сек
        );

        onSnapshot(msgQuery, async (msgSnap) => {
          for (const change of msgSnap.docChanges()) {
            if (change.type === 'added') {
              const msgId = change.doc.id;
              if (processedMessageIds.current.has(msgId)) continue;
              processedMessageIds.current.add(msgId);

              const msgData = change.doc.data();
              const content = decryptSignal(msgData.content).trim();

              if (content.startsWith('!')) {
                await handleBotCommand(chatId, chatData, content, msgData.senderId, msgId);
              }
            }
          }
        });
      });
    });

    return () => unsubscribe();
  }, [db, user, chatsQuery]);

  const handleBotCommand = async (chatId: string, chat: Chat, commandText: string, senderId: string, msgId: string) => {
    if (!db || !user) return;

    // Нормализация команды: удаляем лишние пробелы и переводим в нижний регистр
    const parts = commandText.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const targetUsername = parts[1];

    // Проверка прав (админ чата или глобальный админ)
    const isAdmin = chat.ownerId === senderId || chat.adminIds?.includes(senderId) || isGlobalAdmin(profile);
    
    const sendBotReply = async (text: string) => {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        chatId,
        senderId: 'bot_nuxus_manager',
        senderName: 'Nuxus Chat Manager 🛡️',
        content: text,
        contentType: 'service',
        sentAt: new Date().toISOString(),
      });
    };

    if (cmd === '!хелп' || cmd === '!help' || cmd === '!помощь') {
      await sendBotReply("🛡️ Доступные команды:\n!бан @user - Заблокировать\n!кик @user - Исключить\n!мут @user - Заглушить\n!анмут @user - Разглушить\n!админ @user - Назначить админом\n!статус - Состояние узла");
      return;
    }

    if (!isAdmin) {
      if (cmd.startsWith('!')) {
        // Если обычный пользователь пытается использовать команду модерации
        const modCmds = ['!бан', '!ban', '!кик', '!kick', '!мут', '!mute', '!админ', '!admin'];
        if (modCmds.some(c => cmd.startsWith(c))) {
          await sendBotReply("🚫 У вас недостаточно прав для этой команды.");
        }
      }
      return;
    }

    // Поиск целевого пользователя по @username
    if (targetUsername) {
      const cleanUsername = targetUsername.startsWith('@') ? targetUsername.toLowerCase() : '@' + targetUsername.toLowerCase();
      const userQ = query(collection(db, 'users'), where('username', '==', cleanUsername), limit(1));
      const userSnap = await getDocs(userQ);
      
      if (userSnap.empty) {
        await sendBotReply(`❌ Пользователь ${targetUsername} не найден.`);
        return;
      }

      const targetUser = userSnap.docs[0].data() as User;
      const targetUid = targetUser.id;

      if (targetUid === chat.ownerId) {
        await sendBotReply("🚫 Нельзя применить санкции к создателю чата.");
        return;
      }

      const chatRef = doc(db, 'chats', chatId);

      switch (cmd) {
        case '!кик':
        case '!kick':
          await updateDoc(chatRef, { 
            participantIds: arrayRemove(targetUid),
            adminIds: arrayRemove(targetUid)
          });
          await sendBotReply(`✅ ${targetUser.name} исключен из сообщества.`);
          break;

        case '!бан':
        case '!ban':
          await updateDoc(chatRef, { 
            participantIds: arrayRemove(targetUid),
            adminIds: arrayRemove(targetUid),
            [`metadata.${targetUid}.isBanned`]: true
          });
          await sendBotReply(`⛔ ${targetUser.name} заблокирован навсегда.`);
          break;

        case '!мут':
        case '!mute':
          const mutedUntil = addDays(new Date(), 1).toISOString();
          await updateDoc(chatRef, { 
            [`metadata.${targetUid}.mutedUntil`]: mutedUntil
          });
          await sendBotReply(`🔇 ${targetUser.name} заглушен на 24 часа.`);
          break;

        case '!анмут':
        case '!unmute':
          await updateDoc(chatRef, { 
            [`metadata.${targetUid}.mutedUntil`]: null
          });
          await sendBotReply(`🔊 Ограничения с ${targetUser.name} сняты.`);
          break;

        case '!админ':
        case '!admin':
          await updateDoc(chatRef, { 
            adminIds: arrayUnion(targetUid)
          });
          await sendBotReply(`⭐ ${targetUser.name} теперь администратор.`);
          break;

        case '!разжаловать':
        case '!demote':
          await updateDoc(chatRef, { 
            adminIds: arrayRemove(targetUid)
          });
          await sendBotReply(`🎖️ ${targetUser.name} больше не администратор.`);
          break;
      }
    } else if (cmd === '!статус' || cmd === '!status') {
      await sendBotReply(`📊 Состояние Ядра: Стабильно\nУчастников: ${chat.participantIds.length}\nШифрование: QES 2.0 Active`);
    }
  };

  // Стандартная логика уведомлений
  useEffect(() => {
    if (!db || !user || !chatsQuery || !profile) return;

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const chatData = change.doc.data() as any;
        const chatId = change.doc.id;

        if (change.type === 'modified') {
          const lastTime = lastProcessedTimestamps.current[chatId];
          const newTime = chatData.lastMessageAt;

          if (newTime && newTime !== lastTime) {
            lastProcessedTimestamps.current[chatId] = newTime;
            const isSelfMessage = chatData.lastSenderId === user.uid;
            
            if (chatId !== currentChatId && !isFirstLoad.current && !isSelfMessage) {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(() => {});
              }
              toast({ title: chatData.name || 'Nuxus Signal', description: 'Новое сообщение' });
            }
          }
        }
      });
      if (isFirstLoad.current) isFirstLoad.current = false;
    });

    return () => unsubscribe();
  }, [db, user, chatsQuery, currentChatId, toast, profile]);

  return null;
}
