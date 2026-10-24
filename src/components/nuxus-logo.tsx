"use client"

import React from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface MigLogoProps {
  className?: string;
  size?: number;
}

/**
 * MIG LOGO V207.0 «LOCAL ASSET»
 * ОПТИМИЗИРОВАНО: Использует локальный файл /icon.png из папки public.
 */
export function NuxusLogo({ className, size = 120 }: MigLogoProps) {
  // Путь к локальному файлу в папке public
  const LOGO_URL = '/icon.png';

  return (
    <div 
      className={cn("relative flex items-center justify-center shrink-0", className)} 
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 bg-primary/20 blur-[30px] rounded-full animate-pulse opacity-50" />
      
      <div className="relative w-full h-full rounded-[28%] overflow-hidden border-2 border-white/10 shadow-2xl shadow-primary/20 bg-black">
        <Image 
          src={LOGO_URL} 
          alt="MIG Core" 
          fill 
          className="object-cover"
          unoptimized
          priority
        />
      </div>
      
      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none rounded-[28%]" />
    </div>
  );
}
