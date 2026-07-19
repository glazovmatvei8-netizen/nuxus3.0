
"use client"

import React from 'react';

/**
 * BRAND STATUS BADGE V3.0 (Dynamic Island Style)
 * Отрисовывает синий бейдж Nuxus в стиле ВКонтакте, адаптированный под Островок iPhone.
 */
export function BrandStatusBadge() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[10001] pointer-events-none flex justify-center pt-[calc(env(safe-area-inset-top)+2px)] md:hidden">
      <div className="flex items-center gap-2 bg-[#007AFF] pl-2 pr-4 py-1.5 rounded-full shadow-[0_8px_30px_rgba(0,122,255,0.5)] border border-white/20 animate-in fade-in slide-in-from-top-4 duration-1000 scale-90">
        <div className="w-5 h-5 bg-white rounded-lg flex items-center justify-center p-0.5 shadow-md overflow-hidden">
           <img src="https://i.ibb.co/sd2MqGz2/Icon.png?v=45" alt="N" className="w-full h-full object-contain" />
        </div>
        <span className="text-white text-[13px] font-black uppercase tracking-tight italic leading-none">Nuxus</span>
      </div>
    </div>
  );
}
