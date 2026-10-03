
'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, Auth } from 'firebase/auth';
import { initializeFirestore, Firestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { Preferences } from '@capacitor/preferences';

/**
 * NUXUS ENGINE V86.0 «ALWAYS ON PROTOCOL»
 * ОПТИМИЗИРОВАНО: Включено полноценное оффлайн-кэширование данных (Persistence).
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
    
    // Адаптер для нативного хранилища Preferences (Android/iOS)
    const capacitorPersistence = {
      getItem: async (key: string) => {
        try {
          const { value } = await Preferences.get({ key });
          return value;
        } catch (e) { return null; }
      },
      setItem: async (key: string, value: string) => {
        try { await Preferences.set({ key, value }); } catch (e) {}
      },
      removeItem: async (key: string) => {
        try { await Preferences.remove({ key }); } catch (e) {}
      }
    };

    // Проверяем наличие Capacitor безопасно
    const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
    
    // Инициализируем Auth с лучшим доступным методом хранения
    authInstance = initializeAuth(appInstance, {
      // @ts-ignore
      persistence: isNative && typeof window !== 'undefined' && (window as any).getReactNativePersistence 
        // @ts-ignore
        ? (window as any).getReactNativePersistence(capacitorPersistence)
        : [indexedDBLocalPersistence, browserLocalPersistence]
    });

    // ВКЛЮЧАЕМ ОФФЛАЙН-ПЕРСИСТЕНТНОСТЬ (КЭШИРОВАНИЕ)
    dbInstance = initializeFirestore(appInstance, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
    
    console.log('%c🛰️ NUXUS KERNEL: PERSISTENCE ENGINE ACTIVE', 'color: #34C759; font-weight: bold;');
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
