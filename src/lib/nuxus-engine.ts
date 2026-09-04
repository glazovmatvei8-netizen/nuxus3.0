
'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, Auth } from 'firebase/auth';
// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { Preferences } from '@capacitor/preferences';

/**
 * NUXUS ENGINE V69.0 «ABSOLUTE NATIVE BRIDGE»
 * 
 * РЕШЕНИЕ ОШИБКИ 500: Прямая привязка сессии к системной памяти смартфона.
 * Мы больше не полагаемся на localStorage браузера.
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
        const { value } = await Preferences.get({ key });
        return value;
      },
      setItem: async (key: string, value: string) => {
        await Preferences.set({ key, value });
      },
      removeItem: async (key: string) => {
        await Preferences.remove({ key });
      }
    };

    /**
     * ПРАВИЛЬНАЯ НАДЁЖНАЯ АВТОРИЗАЦИЯ ДЛЯ APK
     * Приоритет отдается нативному хранилищу, которое не стирается при очистке кэша.
     */
    const isNative = (window as any).Capacitor?.isNativePlatform();
    
    let persistenceMethod;
    if (isNative) {
      // Используем мобильный метод для APK
      persistenceMethod = getReactNativePersistence(capacitorPersistence as any);
    } else {
      // Резервный метод для PWA/Браузера
      persistenceMethod = [indexedDBLocalPersistence, browserLocalPersistence];
    }

    authInstance = initializeAuth(appInstance, {
      persistence: persistenceMethod
    });

    dbInstance = getFirestore(appInstance);
    
    console.log('%c🛰️ NUXUS NATIVE SHELL ACTIVE', 'color: #A855F7; font-weight: bold;');
  } catch (e) {
    console.error("NUXUS ENGINE IGNITION FAILED:", e);
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
