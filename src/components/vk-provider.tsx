'use client';

import { useEffect, useRef } from 'react';
import { useUser } from '@/firebase';

/**
 * КРИТИЧЕСКИЙ МОСТ VK ID V72.0.0 «DOMAIN FORCE»
 * Исправлено: Параметры синхронизированы с nuxus.fun
 */
export function VkProvider() {
  const { user } = useUser();
  const isInitialized = useRef(false);

  useEffect(() => {
    if (user || typeof window === 'undefined' || isInitialized.current) return;

    const injectSdk = () => {
      const script = document.createElement('script');
      script.id = 'vk-id-sdk-loader';
      script.src = "https://unpkg.com/@vkid/sdk@2.1.0/dist-sdk/umd/index.js";
      script.async = true;
      script.onload = () => initVk();
      document.head.appendChild(script);
    };

    const initVk = async () => {
      const VKID = (window as any).VKIDSDK;
      if (!VKID) return;
      try {
        const isNative = !!(window as any).Capacitor || !!(window as any).webkit;
        const APP_ID = isNative ? 54684554 : 54684553;

        VKID.Config.init({
          app: APP_ID,
          redirectUrl: 'https://nuxus.fun',
          responseMode: 'callback', 
          source: 'lowcode',
        });
        isInitialized.current = true;
      } catch (e) { console.error("VK Error:", e); }
    };

    injectSdk();
  }, [user]);

  return null;
}
