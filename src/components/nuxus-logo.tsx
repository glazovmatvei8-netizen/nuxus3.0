
"use client"

import React from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface NuxusLogoProps {
  className?: string;
  size?: number;
}

/**
 * NUXUS LOGO V27.0.0 «IMAGE CORE»
 * Полная замена SVG на официальную аватарку IMG-2541.jpg.
 */
export function NuxusLogo({ className, size = 120 }: NuxusLogoProps) {
  const LOGO_URL = 'https://i.postimg.cc/T2xvz0mn/IMG-2541.jpg?v=117';

  return (
    <div 
      className={cn("relative flex items-center justify-center shrink-0", className)} 
      style={{ width: size, height: size }}
    >
      {/* Анимированный ореол вокруг логотипа */}
      <div className="absolute inset-0 bg-primary/20 blur-[30px] rounded-full animate-pulse opacity-50" />
      
      <div className="relative w-full h-full rounded-[30%] overflow-hidden border-2 border-white/10 shadow-2xl shadow-primary/20 bg-black">
        <Image 
          src={LOGO_URL} 
          alt="Nuxus Core" 
          fill 
          className="object-cover"
          unoptimized
        />
      </div>
      
      {/* Световой блик */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none rounded-[30%]" />
    </div>
  );
}
