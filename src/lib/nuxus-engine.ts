'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

/**
 * NUXUS ENGINE V17.0 «QUANTUM CORE»
 * 
 * Это полностью автономное программное ядро мессенджера.
 * Оно работает независимо от жизненного цикла React-компонентов.
 * Инициализация происходит один раз на уровне системного модуля.
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
      // Гарантируем использование только одного инстанса
      this.app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
      this.isIgnited = true;
      console.log('🛰️ Nuxus Engine V17: Quantum Core Online');
    } catch (e) {
      console.error('❌ Nuxus Engine: Critical Ignition Failure', e);
    }
  }
}

// Экспортируем синглтон для прямого доступа из любой точки приложения
export const nuxus = NuxusEngine.getInstance();
