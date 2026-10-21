import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * NUXUS TITANIUM AEGIS v6.0 «ZERO TRUST»
 * Эшелонированная защита Ядра: Anti-DoS, Anti-SQLi, Fingerprinting.
 */

const ipRegistry = new Map<string, { count: number, lastReset: number, isBanned: boolean, score: number }>();

export function middleware(request: NextRequest) {
  const ip = request.ip || 'unknown';
  const now = Date.now();

  // 1. ПРИНУДИТЕЛЬНЫЙ HTTPS
  if (request.nextUrl.protocol === 'http:' && !request.nextUrl.hostname.includes('localhost')) {
    return NextResponse.redirect(`https://${request.nextUrl.hostname}${request.nextUrl.pathname}${request.nextUrl.search}`, 301);
  }

  // 2. АНАЛИЗ ПОВЕДЕНИЯ IP
  const state = ipRegistry.get(ip) || { count: 0, lastReset: now, isBanned: false, score: 0 };
  
  if (state.isBanned) {
    return new NextResponse('SIGNAL BLOCKED: Aegis Protocol Active. Your Node is restricted.', { status: 403 });
  }

  // Сброс лимитов каждые 5 секунд
  if (now - state.lastReset > 5000) { 
    state.count = 0;
    state.lastReset = now;
  }
  state.count++;

  // 3. RATE LIMITING (Защита от брутфорса и DDOS)
  if (state.count > 15) { // Лимит 15 запросов за 5 сек
    state.score += 1;
    if (state.score > 5) state.isBanned = true; // При повторных нарушениях - БАН
    ipRegistry.set(ip, state);
    return new NextResponse('Protocol Error: Too many signals', { status: 429 });
  }
  ipRegistry.set(ip, state);

  // 4. ФИЛЬТРАЦИЯ ИНЪЕКЦИЙ (SQLi, XSS)
  const url = request.nextUrl.toString().toLowerCase();
  const suspiciousPatterns = ['union', 'select', 'insert', 'drop', 'delete', 'update', 'script', '<script>', '--', 'waitfor', 'delay'];
  if (suspiciousPatterns.some(p => url.includes(p))) {
    state.isBanned = true;
    ipRegistry.set(ip, state);
    return new NextResponse('AEGIS: Malicious Signal Detected', { status: 400 });
  }

  // 5. SECURITY HEADERS
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Content-Security-Policy', "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval';");
  response.headers.set('X-Nuxus-Shield', 'Active-v6.0');

  return response;
}

export const config = {
  matcher: ['/', '/api/:path*', '/login', '/register'],
}