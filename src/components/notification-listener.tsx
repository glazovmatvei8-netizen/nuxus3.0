
"use client"

import { useEffect, useRef } from 'react';
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, arrayUnion, arrayRemove, addDoc, getDocs, limit, orderBy } from 'firebase/firestore';
import { useAppState } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import type { Chat, User } from '@/lib/types';
import { decryptSignal, isGlobalAdmin } from '@/lib/utils';
import { isAfter, parseISO, addDays } from 'date-fns';

/**
 * Nuxus Notification & Bot Core v65.6.0
 * Управляет уведомлениями и логикой бота Nuxus Chat Manager.
 */
export function NotificationListener() {
  const { user } = useUser();
  const db = useFirestore();
  const { currentChatId } = useAppState();
  const { toast } = useToast();
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
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

  // Основной слушатель команд бота и уведомлений
  useEffect(() => {
    if (!db || !user) return;

    // Слушаем сообщения во всех доступных чатах через глобальный индекс или подписку на чаты
    const chatsQuery = query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid));
    
    const unsubscribe = onSnapshot(chatsQuery, (chatSnapshot) => {
      chatSnapshot.docChanges().forEach((change) => {
        const chatId = change.doc.id;
        const chatData = change.doc.data() as Chat;

        // Если чат обновился (пришло новое сообщение)
        if (change.type === 'modified' || change.type === 'added') {
          const lastTime = chatData.lastMessageAt;
          if (!lastTime) return;

          // Уведомление (если чат не открыт и это не наше сообщение)
          if (chatId !== currentChatId && !isFirstLoad.current && chatData.lastSenderId !== user.uid) {
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(() => {});
            }
            toast({ title: chatData.name || 'Nuxus Signal', description: 'Новое сообщение' });
          }

          // Проверка команд бота (слушаем последние сообщения в этом чате)
          const messagesRef = collection(db, 'chats', chatId, 'messages');
          const lastMsgQuery = query(messagesRef, orderBy('sentAt', 'desc'), limit(1));
          
          getDocs(lastMsgQuery).then((snap) => {
            if (snap.empty) return;
            const msgDoc = snap.docs[0];
            const msgId = msgDoc.id;
            
            if (processedMessageIds.current.has(msgId)) return;
            processedMessageIds.current.add(msgId);

            const msgData = msgDoc.data();
            // Игнорируем старые сообщения (более 1 минуты)
            if (Math.abs(Date.now() - new Date(msgData.sentAt).getTime()) > 60000) return;

            const content = decryptSignal(msgData.content).trim();
            if (content.startsWith('!')) {
              handleBotCommand(chatId, chatData, content, msgData.senderId, msgId);
            }
          });
        }
      });
      
      if (isFirstLoad.current) isFirstLoad.current = false;
    });

    return () => unsubscribe();
  }, [db, user, currentChatId, profile]);

  const handleBotCommand = async (chatId: string, chat: Chat, commandText: string, senderId: string, msgId: string) => {
    if (!db || !user) return;

    const parts = commandText.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const targetUsername = parts[1];

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
      await sendBotReply("🛡️ Команды:\n!бан @user - Бан\n!кик @user - Кик\n!мут @user - Мут (24ч)\n!анмут @user - Снять мут\n!админ @user - Дать админа\n!статус - Состояние Ядра");
      return;
    }

    if (!isAdmin && cmd.startsWith('!')) {
      const modCmds = ['!бан', '!ban', '!кик', '!kick', '!мут', '!mute', '!админ', '!admin'];
      if (modCmds.some(c => cmd.startsWith(c))) {
        await sendBotReply("🚫 Недостаточно прав доступа.");
      }
      return;
    }

    if (targetUsername) {
      const cleanUsername = targetUsername.startsWith('@') ? targetUsername.toLowerCase() : '@' + targetUsername.toLowerCase();
      const userQ = query(collection(db, 'users'), where('username', '==', cleanUsername), limit(1));
      const userSnap = await getDocs(userQ);
      
      if (userSnap.empty) {
        await sendBotReply(`❌ Аккаунт ${targetUsername} не найден.`);
        return;
      }

      const targetUser = userSnap.docs[0].data() as User;
      const targetUid = targetUser.id;

      if (targetUid === chat.ownerId) {
        await sendBotReply("🚫 Ошибка: Нельзя применить санкции к Создателю.");
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
          await sendBotReply(`✅ ${targetUser.name} исключен из Ядра.`);
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
          await sendBotReply(`⭐ ${targetUser.name} назначен Администратором.`);
          break;
      }
    } else if (cmd === '!статус' || cmd === '!status') {
      await sendBotReply(`📊 Узел: Стабилен\nСинхронизация: Активна\nШифрование: QES 2.0`);
    }
  };

  return null;
}
