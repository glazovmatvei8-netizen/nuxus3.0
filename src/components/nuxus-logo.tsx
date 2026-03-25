"use client"

import React from 'react';
import { cn } from '@/lib/utils';

interface NuxusLogoProps {
  className?: string;
  size?: number;
}

export function NuxusLogo({ className, size = 120 }: NuxusLogoProps) {
  return (
    <div className={cn("relative flex items-center justify-center group", className)} style={{ width: size, height: size }}>
      {/* Outer Halo */}
      <div className="absolute inset-0 bg-primary/20 blur-[40px] rounded-full animate-pulse-glow" />
      
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]"
      >
        <defs>
          <linearGradient id="cyberGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Orbiting Rings */}
        <circle 
          cx="100" cy="100" r="92" 
          stroke="url(#cyberGradient)" 
          strokeWidth="0.5" 
          strokeDasharray="10 20" 
          className="opacity-20 animate-[spin_40s_linear_infinite]" 
        />
        
        <circle 
          cx="100" cy="100" r="80" 
          stroke="url(#cyberGradient)" 
          strokeWidth="1" 
          strokeDasharray="100 150" 
          className="opacity-40 animate-[spin_20s_linear_infinite_reverse]" 
        />

        {/* Core Geometry */}
        <path 
          d="M100 40 L160 100 L100 160 L40 100 Z" 
          stroke="url(#cyberGradient)" 
          strokeWidth="2" 
          className="animate-pulse"
        />
        
        <path 
          d="M100 60 L140 100 L100 140 L60 100 Z" 
          fill="url(#cyberGradient)" 
          fillOpacity="0.1" 
          stroke="white" 
          strokeWidth="0.5" 
          strokeOpacity="0.5"
        />

        {/* Center Point */}
        <circle cx="100" cy="100" r="8" fill="white" filter="url(#glow)" className="animate-pulse" />
        <circle cx="100" cy="100" r="4" fill="url(#cyberGradient)" />
      </svg>
    </div>
  );
}
