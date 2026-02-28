
"use client"

import React from 'react';
import { cn } from '@/lib/utils';

interface NuxusLogoProps {
  className?: string;
  size?: number;
}

/**
 * Гипердетализированное программное Ядро Nuxus v5.6.1.
 * Использует многослойные SVG-анимации, градиенты и динамические частицы.
 */
export function NuxusLogo({ className, size = 120 }: NuxusLogoProps) {
  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      {/* Глобальное свечение (Ambient Glow) */}
      <div className="absolute inset-0 bg-primary/20 blur-[60px] rounded-full animate-pulse-glow" />
      
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full drop-shadow-[0_0_20px_rgba(139,92,246,0.6)]"
      >
        <defs>
          <radialGradient id="coreGradient" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(100 100) rotate(90) scale(80)">
            <stop stopColor="#C084FC" />
            <stop offset="0.5" stopColor="#7C3AED" />
            <stop offset="1" stopColor="#1E1B4B" />
          </radialGradient>
          
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#818CF8" />
          </linearGradient>

          <filter id="neonBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Внешнее технологическое кольцо (Пунктир) */}
        <circle 
          cx="100" cy="100" r="92" 
          stroke="currentColor" 
          strokeWidth="1" 
          strokeDasharray="4 8" 
          className="text-primary/20 animate-[spin_20s_linear_infinite]" 
        />

        {/* Среднее кольцо с активными сегментами */}
        <g className="animate-[spin_15s_linear_infinite_reverse] origin-center">
          <circle cx="100" cy="100" r="80" stroke="url(#ringGradient)" strokeWidth="3" strokeDasharray="60 120" strokeLinecap="round" opacity="0.6" />
          <circle cx="100" cy="100" r="80" stroke="white" strokeWidth="1" strokeDasharray="2 178" strokeLinecap="round" filter="url(#neonBlur)" />
        </g>

        {/* Внутренняя геометрия (Квадраты под углом) */}
        <g className="animate-[spin_8s_ease-in-out_infinite] origin-center">
          <rect x="55" y="55" width="90" height="90" rx="12" stroke="white" strokeWidth="0.5" strokeOpacity="0.2" transform="rotate(45 100 100)" />
          <rect x="65" y="65" width="70" height="70" rx="8" stroke="url(#ringGradient)" strokeWidth="1.5" strokeDasharray="10 10" transform="rotate(-15 100 100)" opacity="0.4" />
        </g>

        {/* Центральное энергетическое Ядро */}
        <circle cx="100" cy="100" r="48" fill="url(#coreGradient)" className="animate-pulse" />
        
        {/* Кросс-линзы ядра (Детализация) */}
        <g filter="url(#neonBlur)">
          <path d="M100 65 V135 M65 100 H135" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.8" />
          <circle cx="100" cy="100" r="12" fill="white" fillOpacity="0.3" />
          <circle cx="100" cy="100" r="4" fill="white" />
        </g>

        {/* Орбитальные частицы */}
        <g className="animate-[spin_4s_linear_infinite] origin-center">
          <circle cx="100" cy="20" r="3" fill="#22D3EE" filter="url(#neonBlur)" />
          <circle cx="180" cy="100" r="2" fill="#A855F7" />
        </g>
      </svg>
    </div>
  );
}
