'use client';

/**
 * NUXUS KERNEL API SERVICE V141.0 «BLACK BOX EDITION»
 * Централизованный шлюз для управления сигналами и данными Ядра.
 */
import { 
  collection, doc, addDoc, updateDoc, writeBatch, 
  increment, query, where, getDocs
} from 'firebase/firestore';
import { nuxus } from '@/lib/nuxus-engine';
import { encryptSignal } from '@/lib/utils';
import type { Message, User } from '@/lib/types';

export const signalService = {
  /**
   * Трансляция текстового сигнала (Отправка сообщения)
   */
  async broadcastSignal(chatId: string, userId: string, userName: string, text: string, replyTo?: Message | null) {
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
      msgData.replyToContent = replyTo.content;
      msgData.replyToSenderName = replyTo.senderName;
    }

    try {
      const msgRef = await addDoc(collection(nuxus.db, 'chats', chatId, 'messages'), msgData);
      
      await updateDoc(doc(nuxus.db, 'chats', chatId), { 
        lastMessageAt: new Date().toISOString(),
        isManualUnread: false
      });

      await updateDoc(doc(nuxus.db, 'users', userId), { 
        reputation: increment(0.2) 
      });

      return msgRef.id;
    } catch (e) {
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
      // Quiet fail
    }
  },

  /**
   * Создание нового приватного узла (Личный чат)
   */
  async initializePrivateNode(currentUser: User, otherUser: User) {
    if (!nuxus.db) return;
    
    try {
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
      throw new Error("Kernel API Error: Node Initialization Failed");
    }
  }
};
