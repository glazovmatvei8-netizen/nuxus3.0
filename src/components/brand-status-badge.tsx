
"use client"

import React from 'react';

/**
 * BRAND STATUS BADGE V4.0 (Enhanced Dynamic Island)
 * ИСПРАВЛЕНО: Максимальная высота, адаптация под Notch/Island на iPhone 14.
 */
export function BrandStatusBadge() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[10001] pointer-events-none flex justify-center pt-1 md:hidden">
      <div className="flex items-center gap-2 bg-[#007AFF] pl-2 pr-5 py-2 rounded-full shadow-[0_12px_40px_rgba(0,122,255,0.6)] border border-white/30 animate-in fade-in slide-in-from-top-4 duration-1000 scale-100">
        <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center p-1 shadow-md overflow-hidden">
           <img src="https://i.ibb.co/sd2MqGz2/Icon.png?v=45" alt="N" className="w-full h-full object-contain" />
        </div>
        <span className="text-white text-[15px] font-black uppercase tracking-tight italic leading-none drop-shadow-sm">Nuxus</span>
      </div>
    </div>
  );
}
