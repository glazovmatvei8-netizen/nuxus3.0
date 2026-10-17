'use client';

/**
 * NUXUS KERNEL API SERVICE V141.0 «BLACK BOX EDITION»
 * Централизованный шлюз для управления сигналами и данными Ядра.
 * Этот файл является единственным местом, где JS взаимодействует с базой данных.
 */
import { 
  collection, doc, addDoc, updateDoc, writeBatch, 
  increment, getDoc, query, where, getDocs, limit, orderBy
} from 'firebase/firestore';
import { nuxus } from '@/lib/nuxus-engine';
import { encryptSignal, decryptSignal, triggerHaptic } from '@/lib/utils';
import type { Message, Chat, User } from '@/lib/types';

export const signalService = {
  /**
   * Трансляция текстового сигнала (Отправка сообщения)
   */
  async broadcastSignal(chatId: string, userId: string, userName: string, text: string, replyTo?: Message | null) {
    if (!nuxus.db || !text.trim()) return;

    // Слой шифрования QES 24.1
    const encrypted = encryptSignal(text);
    
    const msgData: any = {
      chatId,
      senderId: userId,
      senderName: userName,
      content: encrypted,
      contentType: 'text',
      sentAt: new Date().toISOString(),
      isRead: false
    };

    if (replyTo) {
      msgData.replyToId = replyTo.id;
      msgData.replyToContent = replyTo.content; // Берем уже зашифрованный контент
      msgData.replyToSenderName = replyTo.senderName;
    }

    try {
      const msgRef = await addDoc(collection(nuxus.db, 'chats', chatId, 'messages'), msgData);
      
      // Атомарное обновление метаданных чата
      await updateDoc(doc(nuxus.db, 'chats', chatId), { 
        lastMessageAt: new Date().toISOString(),
        isManualUnread: false
      });

      // Начисление репутации через Kernel API
      await updateDoc(doc(nuxus.db, 'users', userId), { 
        reputation: increment(0.2) 
      });

      return msgRef.id;
    } catch (e) {
      console.error("Kernel API Error: Signal Delivery Failed", e);
      throw new Error("Kernel API Error: Signal Delivery Failed");
    }
  },

  /**
   * Подтверждение приема сигналов (Пометка прочитанным)
   */
  async acknowledgeSignals(chatId: string, messages: Message[], userId: string) {
    if (!nuxus.db) return;
    const unread = messages.filter(m => m.senderId !== userId && !m.isRead);
    if (unread.length === 0) return;

    try {
      const batch = writeBatch(nuxus.db);
      unread.forEach(msg => {
        const ref = doc(nuxus.db!, 'chats', chatId, 'messages', msg.id);
        batch.update(ref, { isRead: true });
      });
      await batch.commit();
    } catch (e) {
      console.error("Kernel API Error: Failed to acknowledge signals", e);
    }
  },

  /**
   * Создание нового приватного узла (Личный чат)
   */
  async initializePrivateNode(currentUser: User, otherUser: User) {
    if (!nuxus.db) return;
    
    try {
      // Проверка на существующий узел
      const q = query(
        collection(nuxus.db, 'chats'),
        where('type', '==', 'private'),
        where('participantIds', 'array-contains', currentUser.id)
      );
      
      const snapshot = await getDocs(q);
      const existing = snapshot.docs.find(d => {
        const pIds = d.data().participantIds;
        return pIds.includes(otherUser.id) && pIds.length === 2;
      });

      if (existing) return existing.id;

      // Инициализация нового узла
      const newChatData = {
        type: 'private' as const,
        participantIds: [currentUser.id, otherUser.id],
        adminIds: [currentUser.id, otherUser.id],
        ownerId: currentUser.id,
        createdAt: new Date().toISOString(),
        name: otherUser.name,
        username: otherUser.username,
        avatarUrl: otherUser.avatarUrl || null,
        metadata: {
          [currentUser.id]: { name: currentUser.name, username: currentUser.username, avatarUrl: currentUser.avatarUrl },
          [otherUser.id]: { name: otherUser.name, username: otherUser.username, avatarUrl: otherUser.avatarUrl }
        }
      };

      const docRef = await addDoc(collection(nuxus.db, 'chats'), newChatData);
      return docRef.id;
    } catch (e) {
      console.error("Kernel API Error: Node Initialization Failed", e);
      throw new Error("Kernel API Error: Node Initialization Failed");
    }
  },

  /**
   * Аннигиляция сообщения
   */
  async annihilateSignal(chatId: string, messageId: string) {
    if (!nuxus.db) return;
    try {
      const ref = doc(nuxus.db, 'chats', chatId, 'messages', messageId);
      // Вместо физического удаления можно использовать флаг для безопасности
      await updateDoc(ref, { 
        contentType: 'service', 
        content: encryptSignal("Сигнал аннигилирован"),
        isDeleted: true 
      });
    } catch (e) {
      console.error("Kernel API Error: Signal Annihilation Failed", e);
      throw e;
    }
  }
};
