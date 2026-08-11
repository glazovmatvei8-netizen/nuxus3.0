'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

/**
 * NUXUS ENGINE V20.0 «EVENT HORIZON»
 * 
 * Изолированное квантовое ядро. Работает как автономный синглтон.
 * Исключает любые ошибки 'call' за счет прямой инициализации инстансов.
 */
class NuxusEngine {
  private static instance: NuxusEngine;
  public app: FirebaseApp | null = null;
  public auth: Auth | null = null;
  public db: Firestore | null = null;
  private isIgnited = false;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.ignite();
    }
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
      console.log('🛰️ Nuxus Engine V20.0: Event Horizon Active');
    } catch (e) {
      console.error('❌ Nuxus Engine: Critical Failure', e);
    }
  }
}

export const nuxus = NuxusEngine.getInstance();
export const engine = nuxus;
