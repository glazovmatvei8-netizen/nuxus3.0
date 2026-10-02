
'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { Preferences } from '@capacitor/preferences';

/**
 * NUXUS ENGINE V75.0 «ABSOLUTE STABILITY»
 * ОПТИМИЗИРОВАНО: Защищенный запуск с отказоустойчивым мостом памяти.
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

    dbInstance = getFirestore(appInstance);
    
    console.log('%c🛰️ NUXUS KERNEL: IGNITION SUCCESSFUL', 'color: #34C759; font-weight: bold;');
  } catch (e) {
    console.error("NUXUS KERNEL: IGNITION CRASHED", e);
    // Резервная инициализация при крахе
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
