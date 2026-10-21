
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * NUXUS TITANIUM AEGIS v8.1 «MOBILE COMPATIBLE»
 */

const ipRegistry = new Map<string, { count: number, lastReset: number, isBanned: boolean, score: number }>();

export function middleware(request: NextRequest) {
  const ip = request.ip || 'unknown';
  const now = Date.now();
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
  const hostname = request.nextUrl.hostname;

  // 1. SKIP FOR LOCALHOST / MOBILE INTERNAL
  const isLocal = hostname.includes('localhost') || hostname.includes('127.0.0.1');

  // 2. FORCE HTTPS (WEB ONLY)
  if (request.nextUrl.protocol === 'http:' && !isLocal) {
    return NextResponse.redirect(`https://${hostname}${request.nextUrl.pathname}${request.nextUrl.search}`, 301);
  }

  // 3. ANTI-SCRAPE
  const forbiddenBots = ['wget', 'curl', 'python', 'libwww', 'httpclient', 'php', 'headless', 'puppeteer', 'selenium'];
  if (forbiddenBots.some(bot => userAgent.includes(bot)) && !userAgent.includes('googlebot')) {
    return new NextResponse('ACCESS_DENIED', { status: 403 });
  }

  // 4. BRUTE-FORCE MITIGATION
  const state = ipRegistry.get(ip) || { count: 0, lastReset: now, isBanned: false, score: 0 };
  if (state.isBanned) return new NextResponse('IP_BANNED', { status: 403 });

  if (now - state.lastReset > 10000) { 
    state.count = 0;
    state.lastReset = now;
  }
  state.count++;

  if (state.count > 15) { 
    state.score += 1;
    if (state.score > 5) {
      state.isBanned = true;
      ipRegistry.set(ip, state);
      return new NextResponse('RATE_LIMIT_EXCEEDED', { status: 429 });
    }
  }
  ipRegistry.set(ip, state);

  // 5. SECURITY HEADERS
  const response = NextResponse.next();
  
  // Позволяем встраивание только для официальных превью-доменов Firebase/Studio
  if (hostname.includes('firebaseapp') || hostname.includes('web.app') || isLocal) {
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  } else {
    response.headers.set('X-Frame-Options', 'DENY');
  }

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-Nuxus-Shield', 'Active-v8.1');

  return response;
}

export const config = {
  matcher: ['/', '/api/:path*', '/login', '/register'],
}
