
'use client';

import { useEffect, useRef } from 'react';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { useAppState } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { signInWithEmailAndPassword, browserLocalPersistence, setPersistence } from 'firebase/auth';

/**
 * ГЛОБАЛЬНЫЙ МОСТ VK ID V57.9.0
 * Обеспечивает автоматическую шторку (FloatingOneTap) и отказоустойчивый SDK.
 */
export function VkProvider() {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { setIs2FAVerified } = useAppState();
  const { toast } = useToast();
  const floatingOneTapRef = useRef<any>(null);
  const loadAttempts = useRef(0);

  useEffect(() => {
    if (user || typeof window === 'undefined') return;

    let active = true;

    const initVk = async () => {
      const VKID = (window as any).VKIDSDK;
      
      if (!VKID) {
        if (loadAttempts.current < 10 && active) {
          loadAttempts.current++;
          // Если SDK не найден, пробуем догрузить его принудительно
          if (!document.getElementById('vk-sdk-manual')) {
             const script = document.createElement('script');
             script.id = 'vk-sdk-manual';
             script.src = "https://unpkg.com/@vkid/sdk@2.1.0/dist-sdk/umd/index.js";
             script.async = true;
             document.head.appendChild(script);
          }
          setTimeout(initVk, 500);
        }
        return;
      }

      try {
        const isNative = !!(window as any).Capacitor || !!(window as any).webkit;
        const APP_ID = isNative ? 54684554 : 54684553;

        VKID.Config.init({
          app: APP_ID,
          redirectUrl: 'https://nuxus.fun',
          responseMode: VKID.ConfigResponseMode.Callback,
          source: VKID.ConfigSource.LOWCODE,
        });

        const floatingOneTap = new VKID.FloatingOneTap();
        floatingOneTapRef.current = floatingOneTap;

        floatingOneTap.render({
          appName: 'Nuxus',
          showAlternativeLogin: true
        })
        .on(VKID.WidgetEvents.ERROR, (e: any) => {
          console.warn("VK ID Widget Error:", e);
        })
        .on(VKID.FloatingOneTapInternalEvents.LOGIN_SUCCESS, async (payload: any) => {
          try {
            const data = await VKID.Auth.exchangeCode(payload.code, payload.device_id);
            await handleVkSuccess(data);
            floatingOneTap.close();
          } catch (e: any) {
            toast({ title: "Сбой сигнала", description: e.message, variant: "destructive" });
          }
        });
      } catch (e) {
        console.error("VK Init Error:", e);
      }
    };

    const handleVkSuccess = async (data: any) => {
      if (!db || !auth) return;
      
      const vId = data.user_id || data.id;
      const vkEmail = `vk_${vId}@nuxus.chat`;
      const vkPass = `vk_quantum_${vId}_secure_v57`;

      try {
        const vkSnap = await getDocs(query(collection(db, 'users'), where('vkId', '==', vId), limit(1)));
        
        if (!vkSnap.empty) {
          await setPersistence(auth, browserLocalPersistence);
          await signInWithEmailAndPassword(auth, vkEmail, vkPass);
          setIs2FAVerified(true);
          toast({ title: "Узел авторизован", description: "Добро пожаловать." });
        } else {
          sessionStorage.setItem('nuxus_vk_pending', JSON.stringify({
            vkId: vId,
            name: data.user?.first_name ? `${data.user.first_name} ${data.user.last_name || ''}` : "VK User",
            phone: (data.user?.phone || "").replace(/\D/g, '')
          }));
          toast({ title: "VK ID Распознан", description: "Завершите регистрацию." });
        }
      } catch (e: any) {
        console.error("VK Sync Error:", e);
      }
    };

    initVk();

    return () => {
      active = false;
      if (floatingOneTapRef.current) floatingOneTapRef.current.close();
    };
  }, [user, db, auth, setIs2FAVerified, toast]);

  return null;
}
