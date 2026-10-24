import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * MIG TITANIUM AEGIS v10.0 «HYPER-COMPATIBLE»
 * ОПТИМИЗИРОВАНО: Полная поддержка встраивания для Cloud Workstations.
 */
export function middleware(request: NextRequest) {
  const hostname = request.nextUrl.hostname;
  const isLocal = hostname.includes('localhost') || hostname.includes('127.0.0.1');
  const isPreview = hostname.includes('firebaseapp.com') || hostname.includes('web.app');
  const isWorkstation = hostname.includes('cloudworkstations.dev');

  // 1. FORCE HTTPS (WEB ONLY)
  if (request.nextUrl.protocol === 'http:' && !isLocal && !isWorkstation) {
    return NextResponse.redirect(`https://${hostname}${request.nextUrl.pathname}${request.nextUrl.search}`, 301);
  }

  const response = NextResponse.next();
  
  // 2. PREVIEW UNLOCK: Allow embedding for official Studio/Workstations domains
  if (isPreview || isLocal || isWorkstation) {
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    // Расширенная политика для поддержки всех поддоменов Workstations
    response.headers.set('Content-Security-Policy', "frame-ancestors 'self' https://*.firebaseapp.com https://*.web.app https://*.google.com https://*.cloudworkstations.dev;");
  } else {
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Content-Security-Policy', "frame-ancestors 'none';");
  }

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-MIG-Shield', 'Active-v10.0');

  return response;
}

export const config = {
  matcher: ['/', '/api/:path*', '/login', '/register'],
}
