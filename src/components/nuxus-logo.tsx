"use client"

import React from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface MigLogoProps {
  className?: string;
  size?: number;
}

/**
 * MIG LOGO V2.0 «CYBER M»
 */
export function NuxusLogo({ className, size = 120 }: MigLogoProps) {
  const LOGO_URL = 'https://storage.googleapis.com/fetch-studio-images/ed639417-646c-4867-b5cc-74431f0e2ec3.png';

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
          data-ai-hint="cyberpunk high-tech logo"
        />
      </div>
      
      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none rounded-[28%]" />
    </div>
  );
}
