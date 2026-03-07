
"use client"

import React from 'react';
import { cn } from '@/lib/utils';

interface NuxusLogoProps {
  className?: string;
  size?: number;
}

/**
 * Оптимизированное Ядро Nuxus v2.0.
 * Упрощены SVG-фильтры для мгновенной отрисовки без нагрузки на процессор.
 */
export function NuxusLogo({ className, size = 120 }: NuxusLogoProps) {
  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      {/* Глобальное свечение (Ambient Glow) */}
      <div className="absolute inset-0 bg-primary/20 blur-[30px] rounded-full animate-pulse" />
      
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
        </defs>

        {/* Внешнее пунктирное кольцо */}
        <circle 
          cx="100" cy="100" r="90" 
          stroke="currentColor" 
          strokeWidth="1" 
          strokeDasharray="4 8" 
          className="text-primary/30 animate-[spin_60s_linear_infinite]" 
        />

        {/* Основное кольцо */}
        <g className="animate-[spin_20s_linear_infinite_reverse] origin-center">
          <circle cx="100" cy="100" r="80" stroke="url(#ringGradient)" strokeWidth="2" strokeDasharray="80 160" strokeLinecap="round" opacity="0.8" />
        </g>

        {/* Геометрия ядра */}
        <g className="animate-[spin_10s_ease-in-out_infinite] origin-center">
          <rect x="65" y="65" width="70" height="70" rx="15" stroke="white" strokeWidth="1" strokeOpacity="0.3" transform="rotate(45 100 100)" />
        </g>

        {/* Центральное Ядро */}
        <circle cx="100" cy="100" r="45" fill="url(#coreGradient)" className="animate-pulse" />
        
        {/* Центр */}
        <circle cx="100" cy="100" r="5" fill="white" className="animate-pulse shadow-[0_0_10px_white]" />

        {/* Орбитальная частица */}
        <g className="animate-[spin_8s_linear_infinite] origin-center">
          <circle cx="100" cy="25" r="4" fill="#22D3EE" />
        </g>
      </svg>
    </div>
  );
}
