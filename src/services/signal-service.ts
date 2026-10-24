'use client';

/**
 * NUXUS KERNEL API SERVICE V142.0 «OMEGA PROTOCOL»
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
  async broadcastSignal(chatId: string, userId: string, userName: string, text: string, replyTo?: Message | null, selfDestructAt?: string | null, scheduledAt?: string | null) {
    if (!nuxus.db || !text.trim()) return;

    const encrypted = encryptSignal(text);
    
    const msgData: any = {
      chatId,
      senderId: userId,
      senderName: userName,
      content: encrypted,
      contentType: 'text',
      sentAt: new Date().toISOString(),
      isRead: false,
      selfDestructAt: selfDestructAt || null,
      scheduledAt: scheduledAt || null
    };

    if (replyTo) {
      msgData.replyToId = replyTo.id;
      msgData.replyToContent = replyTo.content;
      msgData.replyToSenderName = replyTo.senderName;
    }

    try {
      const msgRef = await addDoc(collection(nuxus.db, 'chats', chatId, 'messages'), msgData);
      
      // Update chat state only if it's not a future signal
      if (!scheduledAt) {
        await updateDoc(doc(nuxus.db, 'chats', chatId), { 
          lastMessageAt: new Date().toISOString(),
          isManualUnread: false
        });
      }

      await updateDoc(doc(nuxus.db, 'users', userId), { 
        reputation: increment(0.2) 
      });

      return msgRef.id;
    } catch (e) {
      console.error("Signal broadcast error:", e);
      throw new Error("Kernel API Error: Signal Delivery Failed");
    }
  },

  /**
   * Обновление существующего сигнала (Редактирование)
   */
  async updateSignal(chatId: string, messageId: string, newText: string) {
    if (!nuxus.db || !newText.trim()) return;

    const encrypted = encryptSignal(newText);
    
    try {
      const msgRef = doc(nuxus.db, 'chats', chatId, 'messages', messageId);
      await updateDoc(msgRef, {
        content: encrypted,
        editedAt: new Date().toISOString()
      });
      return true;
    } catch (e) {
      console.error("Signal update error:", e);
      throw new Error("Kernel API Error: Signal Update Rejected");
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
      console.error("Signal acknowledge error:", e);
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
      console.error("Node initialization error:", e);
      throw new Error("Kernel API Error: Node Initialization Failed");
    }
  }
};