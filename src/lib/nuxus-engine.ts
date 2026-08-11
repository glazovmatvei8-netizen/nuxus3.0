'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

/**
 * NUXUS ENGINE V22.0 «ABSOLUTE ZERO»
 * 
 * Полностью автономное ядро на базе функциональных геттеров.
 * Исключает ReferenceError и конфликты модулей Webpack.
 * Прямая инициализация без классов для максимальной скорости.
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
    authInstance = getAuth(appInstance);
    dbInstance = getFirestore(appInstance);
    console.log('🛰️ Nuxus Engine V22.0: Active');
  } catch (e) {
    console.error('❌ Nuxus Engine: Ignition Failure', e);
  }
};

// Экспортируем геттеры для гарантированного доступа
export const nuxus = {
  get app() { 
    if (!appInstance) ignite();
    return appInstance; 
  },
  get auth() { 
    if (!authInstance) ignite();
    return authInstance; 
  },
  get db() { 
    if (!dbInstance) ignite();
    return dbInstance; 
  }
};

export const engine = nuxus;
