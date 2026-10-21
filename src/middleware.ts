
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * NUXUS TITANIUM AEGIS v8.0 «ULTRA SHIELD»
 * Эшелонированная защита Ядра: Anti-Clone, Anti-BruteForce, Anti-DDoS.
 */

const ipRegistry = new Map<string, { count: number, lastReset: number, isBanned: boolean, score: number }>();

export function middleware(request: NextRequest) {
  const ip = request.ip || 'unknown';
  const now = Date.now();
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';

  // 1. FORCE HTTPS
  if (request.nextUrl.protocol === 'http:' && !request.nextUrl.hostname.includes('localhost')) {
    return NextResponse.redirect(`https://${request.nextUrl.hostname}${request.nextUrl.pathname}${request.nextUrl.search}`, 301);
  }

  // 2. ANTI-SCRAPE & BOT SHIELD
  const forbiddenBots = [
    'wget', 'curl', 'python', 'libwww', 'httpclient', 'php', 'headless', 
    'puppeteer', 'selenium', 'playwright', 'scrap', 'bot', 'spider', 'crawler',
    'axios', 'node-fetch', 'go-http'
  ];
  
  if (forbiddenBots.some(bot => userAgent.includes(bot)) && !userAgent.includes('googlebot')) {
    return new NextResponse('ACCESS_DENIED: Connection terminated by Aegis Protocol.', { status: 403 });
  }

  // 3. BRUTE-FORCE MITIGATION (Aegis 8.0)
  const state = ipRegistry.get(ip) || { count: 0, lastReset: now, isBanned: false, score: 0 };
  
  if (state.isBanned) {
    return new NextResponse('SIGNAL BLOCKED: Critical Integrity Violation. IP Blacklisted.', { status: 403 });
  }

  // Сброс счетчика каждые 10 секунд
  if (now - state.lastReset > 10000) { 
    state.count = 0;
    state.lastReset = now;
  }
  state.count++;

  // Если более 10 запросов за 10 секунд — увеличиваем подозрительность
  if (state.count > 10) { 
    state.score += 1;
    if (state.score > 10) {
      state.isBanned = true;
      ipRegistry.set(ip, state);
      return new NextResponse('AEGIS: Excessive Load Detected. Node Isolated.', { status: 429 });
    }
    ipRegistry.set(ip, state);
    return new NextResponse('Protocol Error: High Signal Density', { status: 429 });
  }
  ipRegistry.set(ip, state);

  // 4. INJECTION FILTERING (WAF)
  const url = request.nextUrl.toString().toLowerCase();
  const suspiciousPatterns = ['union', 'select', 'insert', 'drop', 'delete', 'update', 'script', '<script>', '--', 'waitfor', 'delay', 'sleep', '@@version'];
  if (suspiciousPatterns.some(p => url.includes(p))) {
    state.isBanned = true; // Мгновенный бан за инъекцию
    ipRegistry.set(ip, state);
    return new NextResponse('AEGIS: Malicious Signal Detected. Node Banned.', { status: 400 });
  }

  // 5. SECURITY HEADERS
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Content-Security-Policy', "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'none';");
  response.headers.set('X-Nuxus-Shield', 'Active-v8.0-Ultra');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  return response;
}

export const config = {
  matcher: ['/', '/api/:path*', '/login', '/register'],
}
