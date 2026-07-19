'use client';

import { useEffect, useRef } from 'react';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { useAppState } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';

/**
 * КРИТИЧЕСКИЙ МОСТ VK ID V68.0.0 «ABSOLUTE DOMAIN SYNC»
 * Синхронизировано: nuxus.fun | Redirect https://nuxus.fun
 */
export function VkProvider() {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const isInitialized = useRef(false);

  useEffect(() => {
    if (user || typeof window === 'undefined' || isInitialized.current) return;

    const injectSdk = () => {
      if (document.getElementById('vk-id-sdk-loader')) {
        initVk();
        return;
      }
      const script = document.createElement('script');
      script.id = 'vk-id-sdk-loader';
      script.src = "https://unpkg.com/@vkid/sdk@2.1.0/dist-sdk/umd/index.js";
      script.async = true;
      script.onload = () => initVk();
      document.head.appendChild(script);
    };

    const initVk = async () => {
      const VKID = (window as any).VKIDSDK;
      if (!VKID || isInitialized.current) return;

      try {
        const isNative = !!(window as any).Capacitor || !!(window as any).webkit;
        const APP_ID = isNative ? 54684554 : 54684553;

        // Прямая конфигурация для nuxus.fun (строго по скриншоту)
        VKID.Config.init({
          app: APP_ID,
          redirectUrl: 'https://nuxus.fun',
          responseMode: 'callback', 
          source: 'lowcode',
        });

        isInitialized.current = true;
      } catch (e) {
        console.error("Nuxus VK Bridge Fail:", e);
      }
    };

    const timer = setTimeout(injectSdk, 1000);
    return () => clearTimeout(timer);
  }, [user, db, auth]);

  return null;
}
