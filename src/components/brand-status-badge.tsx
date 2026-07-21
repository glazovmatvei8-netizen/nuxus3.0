"use client"

import React from 'react';

/**
 * BRAND STATUS BADGE V71.0.0 «DYNAMIC ISLAND MASTERY»
 * Оптимизирован для iPhone 14/15/16 Pro.
 */
export function BrandStatusBadge() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[10001] pointer-events-none flex justify-center pt-1 md:hidden">
      <div className="flex items-center gap-3 bg-[#007AFF] px-6 py-2.5 rounded-b-[2rem] shadow-[0_15px_40px_rgba(0,122,255,0.6)] border-x border-b border-white/40 animate-in fade-in slide-in-from-top-4 duration-1000 backdrop-blur-md">
        <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-md overflow-hidden ring-1 ring-black/5">
           <img src="https://i.ibb.co/sd2MqGz2/Icon.png?v=45" alt="N" className="w-full h-full object-contain" />
        </div>
        <span className="text-white text-[20px] font-black uppercase tracking-tighter italic leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">Nuxus</span>
      </div>
    </div>
  );
}
