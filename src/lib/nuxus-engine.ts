
'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, Auth } from 'firebase/auth';
import { initializeFirestore, Firestore, persistentLocalCache, persistentSingleTabManager, terminate, clearIndexedDbPersistence } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { Preferences } from '@capacitor/preferences';

/**
 * NUXUS ENGINE V149.0 «TITANIUM STABILITY»
 * ОПТИМИЗИРОВАНО: Предотвращение дублирования инстансов для исключения ошибки 'ca9'.
 */

let appInstance: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

const ignite = () => {
  if (typeof window === 'undefined') return;
  
  // Singleton pattern check
  if (appInstance && dbInstance) return;

  try {
    const apps = getApps();
    appInstance = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
    
    // Инициализация Auth (только если не создана)
    if (!authInstance) {
      authInstance = initializeAuth(appInstance, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence]
      });
    }

    // Инициализация Firestore с защитой от повторного вызова
    if (!dbInstance) {
      dbInstance = initializeFirestore(appInstance, {
        localCache: persistentLocalCache({
          tabManager: persistentSingleTabManager()
        })
      });
    }
    
    console.log('%c🛰️ NUXUS KERNEL: TITANIUM STABILITY ACTIVE V149', 'color: #34C759; font-weight: bold;');
  } catch (e) {
    console.error("NUXUS KERNEL: IGNITION CRASHED", e);
    // Аварийный сброс при критическом сбое инициализации
    if (!appInstance) appInstance = initializeApp(firebaseConfig);
  }
};

export const nuxus = {
  get app() { 
    if (typeof window !== 'undefined' && !appInstance) ignite();
    return appInstance; 
  },
  get auth() { 
    if (typeof window !== 'undefined' && !authInstance) ignite();
    return authInstance; 
  },
  get db() { 
    if (typeof window !== 'undefined' && !dbInstance) ignite();
    return dbInstance; 
  },
  
  /**
   * Принудительная перезагрузка Ядра при системных сбоях
   */
  async emergencyReset() {
    if (dbInstance) {
      await terminate(dbInstance);
      await clearIndexedDbPersistence(dbInstance);
      window.location.reload();
    }
  }
};

export const engine = nuxus;
