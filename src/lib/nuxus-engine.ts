'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

/**
 * NUXUS ORIGIN ENGINE V16.0 «ABSOLUTE ORIGIN»
 * 
 * Это автономное ядро мессенджера. Оно работает независимо от React
 * и гарантирует 100% доступность сервисов Firebase.
 * Инициализация происходит один раз на уровне модуля.
 */
class NuxusEngine {
  private static instance: NuxusEngine;
  public app: FirebaseApp | null = null;
  public auth: Auth | null = null;
  public db: Firestore | null = null;
  private isIgnited = false;

  private constructor() {
    if (typeof window === 'undefined') return;
    this.ignite();
  }

  public static getInstance(): NuxusEngine {
    if (!NuxusEngine.instance) {
      NuxusEngine.instance = new NuxusEngine();
    }
    return NuxusEngine.instance;
  }

  private ignite() {
    if (this.isIgnited) return;
    try {
      const apps = getApps();
      this.app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
      this.isIgnited = true;
      console.log('🛰️ Nuxus Engine V16: Absolute Origin Online');
    } catch (e) {
      console.error('❌ Nuxus Engine: Critical Failure', e);
    }
  }
}

export const nuxus = NuxusEngine.getInstance();
