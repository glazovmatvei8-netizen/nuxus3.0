
'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, Auth } from 'firebase/auth';
import { initializeFirestore, Firestore, persistentLocalCache, persistentSingleTabManager } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { Preferences } from '@capacitor/preferences';

/**
 * NUXUS ENGINE V87.0 «STABILITY MAXIMUS»
 * ОПТИМИЗИРОВАНО: Переход на persistentSingleTabManager для устранения ошибки ca9 в APK.
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
        } catch (e) { return null; }
      },
      setItem: async (key: string, value: string) => {
        try { await Preferences.set({ key, value }); } catch (e) {}
      },
      removeItem: async (key: string) => {
        try { await Preferences.remove({ key }); } catch (e) {}
      }
    };

    const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
    
    authInstance = initializeAuth(appInstance, {
      // @ts-ignore
      persistence: isNative && typeof window !== 'undefined' && (window as any).getReactNativePersistence 
        // @ts-ignore
        ? (window as any).getReactNativePersistence(capacitorPersistence)
        : [indexedDBLocalPersistence, browserLocalPersistence]
    });

    // ФИКС ОШИБКИ ca9: Используем singleTabManager, так как в APK нет вкладок
    dbInstance = initializeFirestore(appInstance, {
      localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager()
      })
    });
    
    console.log('%c🛰️ NUXUS KERNEL: STABLE PERSISTENCE ACTIVE', 'color: #34C759; font-weight: bold;');
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
