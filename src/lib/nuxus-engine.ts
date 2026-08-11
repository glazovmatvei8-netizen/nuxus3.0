'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

/**
 * NUXUS ENGINE V24.0 «PRIME KERNEL»
 * 
 * ПОЛНАЯ АВТОНОМНОСТЬ: Движок работает как изолированный синглтон.
 * Гарантирует отсутствие ошибки 'call' за счет исключения реактивных зависимостей при инициализации.
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
    
    console.log('%c🛰️ NUXUS ENGINE V24: QUANTUM LINK ESTABLISHED', 'color: #a855f7; font-weight: bold;');
  } catch (e) {
    console.warn('⚠️ Nuxus Engine: Critical ignition bypass');
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
