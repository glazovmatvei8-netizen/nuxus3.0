
"use client"

import { useEffect, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase/provider';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAppState } from '@/lib/app-state';
import { useToast } from '@/hooks/use-toast';
import type { Call } from '@/lib/types';

/**
 * NUXUS NOTIFICATION CORE V74.0.0
 * ИСПРАВЛЕНО: Путь импорта useAppState.
 */
export function NotificationListener() {
  const { user } = useUser();
  const db = useFirestore();
  const { activeCallId, setActiveCallId } = useAppState();
  const { toast } = useToast();
  
  useEffect(() => {
    if (!db || !user) return;

    // 1. Поиск входящих звонков (Режим реального времени)
    const callsQuery = query(
      collection(db, 'calls'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'calling')
    );

    const unsubscribeCalls = onSnapshot(callsQuery, (snap) => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added' || (change.type === 'modified' && change.doc.data().status === 'calling')) {
          const call = { id: change.doc.id, ...change.doc.data() } as Call;
          
          // Если мы еще не в звонке и звонок направлен нам
          if (!activeCallId && call.id !== activeCallId) {
            setActiveCallId(call.id);
            
            // Вибрация (если поддерживается)
            if (window.navigator && window.navigator.vibrate) {
              window.navigator.vibrate([500, 200, 500, 200, 500]);
            }

            toast({ 
              title: "Входящий вызов", 
              description: "Узел запрашивает соединение по защищенной линии.",
              duration: 10000 
            });
          }
        }
      });
    });

    return () => {
      unsubscribeCalls();
    };
  }, [db, user, activeCallId, setActiveCallId, toast]);

  return null;
}
