
"use client"

import React from 'react';
import { Wrench } from 'lucide-react';

/**
 * PARTNER HUB V102.0 «ORDER PROTOCOL»
 * Функционал ботов временно аннигилирован по запросу Оператора.
 */
export default function PartnerView() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#020205] p-10 text-center space-y-8 animate-in fade-in duration-700">
      <div className="relative">
        <div className="absolute -inset-10 bg-primary/20 blur-[60px] rounded-full animate-pulse" />
        <Wrench className="w-20 h-20 text-primary relative z-10" />
      </div>
      <div className="space-y-4 max-w-sm">
        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">PARTNER HUB MAINTENANCE</h2>
        <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.3em] leading-relaxed">
          Раздел разработки ботов временно недоступен. <br/>Инженеры Ядра проводят оптимизацию протоколов безопасности.
        </p>
      </div>
    </div>
  );
}
