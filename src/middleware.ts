import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * NUXUS TITANIUM AEGIS v7.0 «SOVEREIGN SHIELD»
 * Эшелонированная защита Ядра: Anti-Clone, Anti-Iframe, Anti-Scrape, Anti-DDoS.
 */

const ipRegistry = new Map<string, { count: number, lastReset: number, isBanned: boolean, score: number }>();

export function middleware(request: NextRequest) {
  const ip = request.ip || 'unknown';
  const now = Date.now();
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';

  // 1. ПРИНУДИТЕЛЬНЫЙ HTTPS
  if (request.nextUrl.protocol === 'http:' && !request.nextUrl.hostname.includes('localhost')) {
    return NextResponse.redirect(`https://${request.nextUrl.hostname}${request.nextUrl.pathname}${request.nextUrl.search}`, 301);
  }

  // 2. ANTI-SCRAPE & BOT SHIELD (Блокировка парсеров и копировщиков)
  const forbiddenBots = [
    'wget', 'curl', 'python', 'libwww', 'httpclient', 'php', 'headless', 
    'puppeteer', 'selenium', 'playwright', 'scrap', 'bot', 'spider', 'crawler',
    'axios', 'node-fetch', 'go-http'
  ];
  
  if (forbiddenBots.some(bot => userAgent.includes(bot)) && !userAgent.includes('googlebot')) {
    return new NextResponse('ACCESS_DENIED: Your node identifies as an automated scraper. Connection terminated.', { status: 403 });
  }

  // 3. АНАЛИЗ ПОВЕДЕНИЯ IP (DDoS Mitigation)
  const state = ipRegistry.get(ip) || { count: 0, lastReset: now, isBanned: false, score: 0 };
  
  if (state.isBanned) {
    return new NextResponse('SIGNAL BLOCKED: Aegis Protocol Active. Your Node is restricted.', { status: 403 });
  }

  if (now - state.lastReset > 5000) { 
    state.count = 0;
    state.lastReset = now;
  }
  state.count++;

  if (state.count > 20) { 
    state.score += 1;
    if (state.score > 5) state.isBanned = true;
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

  // 5. SECURITY HEADERS (Anti-Iframe & Data Integrity)
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Content-Security-Policy', "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'none';");
  response.headers.set('X-Nuxus-Shield', 'Active-v7.0');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  return response;
}

export const config = {
  matcher: ['/', '/api/:path*', '/login', '/register'],
}
