"use client"

import React from 'react';

/**
 * BRAND STATUS BADGE V68.0.0 (Absolute Notch Mastery)
 * Fixed: Maximized visibility in the iPhone Dynamic Island area.
 */
export function BrandStatusBadge() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[10001] pointer-events-none flex justify-center pt-0 md:hidden">
      <div className="flex items-center gap-3 bg-[#007AFF] px-4 py-2 rounded-b-[1.2rem] shadow-[0_10px_30px_rgba(0,122,255,0.6)] border-x border-b border-white/40 animate-in fade-in slide-in-from-top-4 duration-1000 backdrop-blur-md">
        <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center p-1 shadow-md overflow-hidden ring-1 ring-black/5">
           <img src="https://i.ibb.co/sd2MqGz2/Icon.png?v=45" alt="N" className="w-full h-full object-contain" />
        </div>
        <span className="text-white text-[16px] font-black uppercase tracking-tighter italic leading-none drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]">Nuxus</span>
      </div>
    </div>
  );
}
