'use client';

import { useEffect } from 'react';

/**
 * VK Bridge Initializer for VK Mini Apps.
 */
export function VkProvider() {
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).vkBridge) {
      try {
        (window as any).vkBridge.send("VKWebAppInit", {});
        console.log("Nuxus VK: Signal Link Established");
      } catch (e) {
        console.warn("Nuxus VK: Signal Failed", e);
      }
    }
  }, []);

  return null;
}
