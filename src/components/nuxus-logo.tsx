
"use client"

import React from 'react';
import { cn } from '@/lib/utils';

interface NuxusLogoProps {
  className?: string;
  size?: number;
}

export function NuxusLogo({ className, size = 120 }: NuxusLogoProps) {
  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      {/* Outer Glow */}
      <div className="absolute inset-0 bg-primary/30 blur-[40px] rounded-full animate-pulse-glow" />
      
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]"
      >
        <defs>
          <radialGradient id="coreGradient" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(100 100) rotate(90) scale(80)">
            <stop stopColor="#A855F7" />
            <stop offset="0.6" stopColor="#7C3AED" />
            <stop offset="1" stopColor="#1E1B4B" />
          </radialGradient>
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Rotating Outer Ring */}
        <g className="animate-[spin_10s_linear_infinite] origin-center">
          <circle cx="100" cy="100" r="85" stroke="currentColor" strokeWidth="2" strokeDasharray="10 20" className="text-primary/40" />
          <circle cx="100" cy="100" r="85" stroke="currentColor" strokeWidth="4" strokeDasharray="2 180" strokeLinecap="round" className="text-accent" />
        </g>

        {/* Inner Geometric Shapes */}
        <g className="animate-[spin_6s_linear_infinite_reverse] origin-center">
          <path d="M100 35 L165 100 L100 165 L35 100 Z" stroke="currentColor" strokeWidth="1" className="text-primary/20" />
          <rect x="60" y="60" width="80" height="80" rx="10" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" className="text-accent/30" />
        </g>

        {/* Central Power Core */}
        <circle cx="100" cy="100" r="45" fill="url(#coreGradient)" className="animate-pulse" />
        <circle cx="100" cy="100" r="25" fill="white" fillOpacity="0.2" filter="url(#neonGlow)" />
        
        {/* Core Detail Lines */}
        <line x1="100" y1="70" x2="100" y2="130" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" />
        <line x1="70" y1="100" x2="130" y2="100" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" />
      </svg>
    </div>
  );
}
