
'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, Auth } from 'firebase/auth';
import { initializeFirestore, Firestore, persistentLocalCache, persistentSingleTabManager } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { Preferences } from '@capacitor/preferences';

/**
 * NUXUS ENGINE V123.0 «STABILITY MAXIMUS»
 * ОПТИМИЗИРОВАНО: Forced Persistence for both PWA and Native.
 */

let appInstance: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

const ignite = () => {
  if (typeof window === 'undefined') return;
  if (appInstance) return;

  try {
    const apps = getApps();
    appInstance = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
    
    const capacitorPersistence = {
      getItem: async (key: string) => {
        try {
          const { value } = await Preferences.get({ key });
          return value;
        } catch (e) {
          console.error("Failed to get item from Preferences:", e);
          return null;
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          await Preferences.set({ key, value });
        } catch (e) {
          console.error("Failed to set item in Preferences:", e);
        }
      },
      removeItem: async (key: string) => {
        try {
          await Preferences.remove({ key });
        } catch (e) {
          console.error("Failed to remove item in Preferences:", e);
        }
      }
    };

    const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
    
    // Принудительно устанавливаем долгосрочное сохранение сессии
    authInstance = initializeAuth(appInstance, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence]
    });

    dbInstance = initializeFirestore(appInstance, {
      localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager()
      })
    }, firebaseConfig.firestoreDatabaseId);
    
    console.log('%c🛰️ NUXUS KERNEL: STABLE PERSISTENCE ACTIVE V123', 'color: #34C759; font-weight: bold;');
  } catch (e) {
    console.error("NUXUS KERNEL: IGNITION CRASHED", e);
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
  }
};

export const engine = nuxus;
