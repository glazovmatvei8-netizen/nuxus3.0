
"use client"

import React from 'react';

/**
 * BRAND STATUS BADGE V8.0 (iPhone Dynamic Island Mastery)
 * ИСПРАВЛЕНО: Максимально поднят вверх, адаптирован под Dynamic Island.
 */
export function BrandStatusBadge() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[10001] pointer-events-none flex justify-center pt-1 md:hidden">
      <div className="flex items-center gap-3 bg-[#007AFF] pl-2.5 pr-7 py-2.5 rounded-full shadow-[0_15px_50px_rgba(0,122,255,0.8)] border border-white/50 animate-in fade-in slide-in-from-top-2 duration-1000 backdrop-blur-md">
        <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-md overflow-hidden ring-1 ring-black/5">
           <img src="https://i.ibb.co/sd2MqGz2/Icon.png?v=45" alt="N" className="w-full h-full object-contain" />
        </div>
        <span className="text-white text-[18px] font-black uppercase tracking-tighter italic leading-none drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]">Nuxus</span>
      </div>
    </div>
  );
}
