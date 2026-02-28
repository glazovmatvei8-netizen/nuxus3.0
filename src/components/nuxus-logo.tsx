
"use client"

import React from 'react';
import { cn } from '@/lib/utils';

interface NuxusLogoProps {
  className?: string;
  size?: number;
}

/**
 * Гипердетализированное программное Ядро Nuxus v5.6.2.
 * Обновленная анимация: 4 независимых кольца, эффект линзы и динамические частицы.
 */
export function NuxusLogo({ className, size = 120 }: NuxusLogoProps) {
  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      {/* Глобальное свечение (Ambient Glow) */}
      <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full animate-pulse-glow" />
      
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full drop-shadow-[0_0_30px_rgba(139,92,246,0.8)]"
      >
        <defs>
          <radialGradient id="coreGradient" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(100 100) rotate(90) scale(80)">
            <stop stopColor="#C084FC" />
            <stop offset="0.4" stopColor="#8B5CF6" />
            <stop offset="0.8" stopColor="#4C1D95" />
            <stop offset="1" stopColor="#0F172A" />
          </radialGradient>
          
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="50%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#C084FC" />
          </linearGradient>

          <filter id="neonBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          
          <filter id="lens" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>

        {/* Внешнее технологическое кольцо (Пунктир) */}
        <circle 
          cx="100" cy="100" r="94" 
          stroke="currentColor" 
          strokeWidth="0.5" 
          strokeDasharray="2 10" 
          className="text-primary/30 animate-[spin_30s_linear_infinite]" 
        />

        {/* Среднее кольцо с активными сегментами */}
        <g className="animate-[spin_20s_linear_infinite_reverse] origin-center">
          <circle cx="100" cy="100" r="82" stroke="url(#ringGradient)" strokeWidth="4" strokeDasharray="80 100" strokeLinecap="round" opacity="0.7" />
          <circle cx="100" cy="100" r="82" stroke="white" strokeWidth="1.5" strokeDasharray="4 176" strokeLinecap="round" filter="url(#neonBlur)" />
        </g>

        {/* Внутренняя геометрия (Квадраты под углом) */}
        <g className="animate-[spin_12s_ease-in-out_infinite] origin-center">
          <rect x="50" y="55" width="100" height="90" rx="16" stroke="white" strokeWidth="0.5" strokeOpacity="0.3" transform="rotate(45 100 100)" />
          <circle cx="100" cy="100" r="65" stroke="url(#ringGradient)" strokeWidth="1" strokeDasharray="15 5" opacity="0.4" />
        </g>

        {/* Центральное энергетическое Ядро */}
        <circle cx="100" cy="100" r="52" fill="url(#coreGradient)" className="animate-pulse" />
        
        {/* Кросс-линзы ядра (Детализация) */}
        <g filter="url(#neonBlur)">
          <path d="M100 60 V140 M60 100 H140" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
          <circle cx="100" cy="100" r="14" fill="white" fillOpacity="0.2" />
          <circle cx="100" cy="100" r="6" fill="white" className="animate-pulse" />
        </g>

        {/* Орбитальные частицы (Система зарядов) */}
        <g className="animate-[spin_6s_linear_infinite] origin-center">
          <circle cx="100" cy="15" r="4" fill="#22D3EE" filter="url(#neonBlur)" />
          <circle cx="100" cy="15" r="1.5" fill="white" />
        </g>
        
        <g className="animate-[spin_8s_linear_infinite_reverse] origin-center">
          <circle cx="185" cy="100" r="3" fill="#A855F7" filter="url(#neonBlur)" />
          <circle cx="185" cy="100" r="1" fill="white" />
        </g>

        {/* Эффект свечения через линзу */}
        <circle cx="100" cy="100" r="40" fill="white" opacity="0.05" filter="url(#lens)" />
      </svg>
    </div>
  );
}
