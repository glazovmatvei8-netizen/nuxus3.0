
"use client"

import React from 'react';
import { cn } from '@/lib/utils';

interface NuxusLogoProps {
  className?: string;
  size?: number;
}

/**
 * NUXUS LOGO V26.0.0 (Thermal Optimized)
 * Удалены все постоянные анимации свечения для предотвращения нагрева.
 */
export function NuxusLogo({ className, size = 120 }: NuxusLogoProps) {
  return (
    <div className={cn("relative flex items-center justify-center group", className)} style={{ width: size, height: size }}>
      {/* Static Halo (No animation) */}
      <div className="absolute inset-0 bg-primary/5 blur-[20px] rounded-full opacity-60" />
      
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full drop-shadow-[0_0_8px_rgba(168,85,247,0.2)]"
      >
        <defs>
          <linearGradient id="cyberGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>

        {/* Orbiting Rings (Reduced Stroke) */}
        <circle 
          cx="100" cy="100" r="92" 
          stroke="url(#cyberGradient)" 
          strokeWidth="0.5" 
          strokeDasharray="5 15" 
          className="opacity-10" 
        />
        
        <circle 
          cx="100" cy="100" r="80" 
          stroke="url(#cyberGradient)" 
          strokeWidth="0.5" 
          strokeDasharray="50 100" 
          className="opacity-20" 
        />

        {/* Core Geometry */}
        <path 
          d="M100 40 L160 100 L100 160 L40 100 Z" 
          stroke="url(#cyberGradient)" 
          strokeWidth="1.5" 
          className="opacity-80"
        />
        
        <path 
          d="M100 60 L140 100 L100 140 L60 100 Z" 
          fill="url(#cyberGradient)" 
          fillOpacity="0.05" 
          stroke="white" 
          strokeWidth="0.5" 
          strokeOpacity="0.3"
        />

        {/* Center Point */}
        <circle cx="100" cy="100" r="6" fill="white" className="opacity-40" />
        <circle cx="100" cy="100" r="3" fill="url(#cyberGradient)" />
      </svg>
    </div>
  );
}
