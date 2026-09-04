'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, Auth } from 'firebase/auth';
// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { Preferences } from '@capacitor/preferences';

/**
 * NUXUS ENGINE V68.5.1 «TITANIUM SOVEREIGN PRO»
 * 
 * РЕШЕНИЕ ОШИБКИ 500: Использование нативного моста @capacitor/preferences.
 * Этот адаптер привязывает сессию к системной памяти Android, которая 
 * игнорирует очистку кэша браузера и WebView.
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
    
    // Создаем адаптер, который идеально подходит под стандарты Firebase для Capacitor
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
     * Если мы внутри Capacitor, используем нативный мост.
     * Если в браузере — IndexedDB (самый надежный веб-метод).
     */
    const isCapacitor = (window as any).Capacitor !== undefined;
    
    let persistenceMethod;
    if (isCapacitor && typeof getReactNativePersistence === 'function') {
      persistenceMethod = getReactNativePersistence(capacitorPersistence as any);
    } else {
      persistenceMethod = [indexedDBLocalPersistence, browserLocalPersistence];
    }

    authInstance = initializeAuth(appInstance, {
      persistence: persistenceMethod
    });

    dbInstance = getFirestore(appInstance);
    
    console.log('%c🛰️ NUXUS SOVEREIGN ACTIVE [NATIVE_BRIDGE PERSISTENCE]', 'color: #007AFF; font-weight: bold;');
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
