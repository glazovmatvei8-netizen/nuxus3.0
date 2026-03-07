
"use client"

import React from 'react';
import { cn } from '@/lib/utils';

interface NuxusLogoProps {
  className?: string;
  size?: number;
}

/**
 * Оптимизированное Ядро Nuxus.
 * Упрощены SVG-фильтры для снижения нагрузки на процессор (TBT) и ускорения отрисовки (LCP).
 */
export function NuxusLogo({ className, size = 120 }: NuxusLogoProps) {
  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      {/* Глобальное свечение (Ambient Glow) - Облегченное */}
      <div className="absolute inset-0 bg-primary/10 blur-[40px] rounded-full animate-pulse" />
      
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full"
      >
        <defs>
          <radialGradient id="coreGradient" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(100 100) rotate(90) scale(80)">
            <stop stopColor="#C084FC" />
            <stop offset="0.6" stopColor="#8B5CF6" />
            <stop offset="1" stopColor="#0F172A" />
          </radialGradient>
          
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#C084FC" />
          </linearGradient>

          {/* Упрощенный фильтр для производительности */}
          <filter id="lightGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
          </filter>
        </defs>

        {/* Внешнее кольцо */}
        <circle 
          cx="100" cy="100" r="94" 
          stroke="currentColor" 
          strokeWidth="0.5" 
          strokeDasharray="4 8" 
          className="text-primary/20 animate-[spin_40s_linear_infinite]" 
        />

        {/* Основное кольцо */}
        <g className="animate-[spin_25s_linear_infinite_reverse] origin-center">
          <circle cx="100" cy="100" r="82" stroke="url(#ringGradient)" strokeWidth="3" strokeDasharray="60 120" strokeLinecap="round" opacity="0.6" />
        </g>

        {/* Геометрия ядра */}
        <g className="animate-[spin_15s_ease-in-out_infinite] origin-center">
          <rect x="60" y="60" width="80" height="80" rx="12" stroke="white" strokeWidth="0.5" strokeOpacity="0.2" transform="rotate(45 100 100)" />
        </g>

        {/* Центральное Ядро */}
        <circle cx="100" cy="100" r="48" fill="url(#coreGradient)" className="animate-pulse" />
        
        {/* Кросс-линзы (Статичные для скорости) */}
        <path d="M100 70 V130 M70 100 H130" stroke="white" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.4" />
        <circle cx="100" cy="100" r="4" fill="white" filter="url(#lightGlow)" />

        {/* Орбитальные частицы (Облегченные) */}
        <g className="animate-[spin_10s_linear_infinite] origin-center">
          <circle cx="100" cy="20" r="3" fill="#22D3EE" opacity="0.8" />
        </g>
      </svg>
    </div>
  );
}
