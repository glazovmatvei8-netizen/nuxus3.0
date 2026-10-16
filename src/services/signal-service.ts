'use client';

/**
 * NUXUS SIGNAL SERVICE API V140.0
 * Централизованный слой для управления сигналами (сообщениями) и чатами.
 * Обеспечивает абстракцию от Firebase и повышает безопасность кода.
 */
import { 
  collection, doc, addDoc, updateDoc, writeBatch, 
  increment, serverTimestamp, query, orderBy, limit 
} from 'firebase/firestore';
import { nuxus } from '@/lib/nuxus-engine';
import { encryptSignal, decryptSignal, triggerHaptic } from '@/lib/utils';
import type { Message, Chat } from '@/lib/types';

export const signalService = {
  /**
   * Отправка текстового сигнала через API Ядра
   */
  async sendText(chatId: string, userId: string, userName: string, text: string, replyTo?: Message | null) {
    if (!nuxus.db || !text.trim()) return;

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
      msgData.replyToContent = replyTo.content; // Уже зашифрован в базе
      msgData.replyToSenderName = replyTo.senderName;
    }

    try {
      const msgRef = await addDoc(collection(nuxus.db, 'chats', chatId, 'messages'), msgData);
      await updateDoc(doc(nuxus.db, 'chats', chatId), { 
        lastMessageAt: new Date().toISOString() 
      });
      // Повышение репутации за активность
      await updateDoc(doc(nuxus.db, 'users', userId), { reputation: increment(0.2) });
      return msgRef.id;
    } catch (e) {
      console.error("Signal API: Delivery Failed", e);
      throw e;
    }
  },

  /**
   * Массовая отметка сообщений как прочитанных
   */
  async markAsRead(chatId: string, messages: Message[], userId: string) {
    if (!nuxus.db) return;
    const unread = messages.filter(m => m.senderId !== userId && !m.isRead);
    if (unread.length === 0) return;

    const batch = writeBatch(nuxus.db);
    unread.forEach(msg => {
      const ref = doc(nuxus.db!, 'chats', chatId, 'messages', msg.id);
      batch.update(ref, { isRead: true });
    });
    
    try {
      await batch.commit();
    } catch (e) {
      console.warn("Signal API: MarkRead batch failed");
    }
  },

  /**
   * Удаление чата (Аннигиляция)
   */
  async annihilateChat(chatId: string) {
    if (!nuxus.db) return;
    try {
      await updateDoc(doc(nuxus.db, 'chats', chatId), {
        participantIds: [], // Отключаем всех участников
        isArchived: true
      });
    } catch (e) {
      throw e;
    }
  }
};
