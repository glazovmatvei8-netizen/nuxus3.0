"use client"

import React from 'react';

/**
 * BRAND STATUS BADGE V1.0 (iOS Dynamic Style)
 * Отрисовывает синий бейдж Nuxus в верхней части экрана, имитируя системный стиль VK.
 */
export function BrandStatusBadge() {
  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 z-[10001] pointer-events-none w-full flex justify-center pt-[calc(env(safe-area-inset-top)+4px)] md:hidden">
      <div className="flex items-center gap-1.5 bg-[#007AFF] px-3 py-1 rounded-full shadow-[0_4px_15px_rgba(0,122,255,0.4)] border border-white/20 animate-in fade-in slide-in-from-top-4 duration-1000">
        <div className="w-4 h-4 bg-white rounded-[5px] flex items-center justify-center p-0.5 shadow-sm overflow-hidden">
           <img src="https://i.ibb.co/sd2MqGz2/Icon.png?v=45" alt="N" className="w-full h-full object-contain" />
        </div>
        <span className="text-white text-[10px] font-black uppercase tracking-tight italic leading-none">Nuxus</span>
      </div>
    </div>
  );
}
