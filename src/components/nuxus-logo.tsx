
"use client"

import React from 'react';
import { cn } from '@/lib/utils';

interface NuxusLogoProps {
  className?: string;
  size?: number;
}

/**
 * Облегченная версия логотипа Nuxus v2.1.
 * Убраны тяжелые фильтры для устранения лагов на ПК.
 */
export function NuxusLogo({ className, size = 120 }: NuxusLogoProps) {
  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      {/* Мягкое свечение */}
      <div className="absolute inset-0 bg-primary/10 blur-[20px] rounded-full animate-pulse" />
      
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full"
      >
        <defs>
          <radialGradient id="coreGradient" cx="100" cy="100" r="80" gradientUnits="userSpaceOnUse">
            <stop stopColor="#C084FC" />
            <stop offset="1" stopColor="#8B5CF6" />
          </radialGradient>
        </defs>

        {/* Кольца */}
        <circle 
          cx="100" cy="100" r="90" 
          stroke="currentColor" 
          strokeWidth="1" 
          strokeDasharray="4 8" 
          className="text-primary/20 animate-[spin_60s_linear_infinite]" 
        />

        <circle cx="100" cy="100" r="80" stroke="#22D3EE" strokeWidth="1" strokeDasharray="20 40" className="opacity-40 animate-[spin_30s_linear_infinite_reverse] origin-center" />

        {/* Геометрия */}
        <rect x="65" y="65" width="70" height="70" rx="12" stroke="white" strokeWidth="1" strokeOpacity="0.2" className="animate-[spin_15s_linear_infinite] origin-center" />

        {/* Ядро */}
        <circle cx="100" cy="100" r="40" fill="url(#coreGradient)" className="animate-pulse" />
        <circle cx="100" cy="100" r="4" fill="white" className="shadow-[0_0_8px_white]" />
      </svg>
    </div>
  );
}
