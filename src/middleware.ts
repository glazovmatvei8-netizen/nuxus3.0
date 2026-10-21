
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * NUXUS TITANIUM AEGIS v3.0 (WAF & DDoS Mitigation)
 * Самая мощная система защиты Ядра на уровне Edge.
 */

// База для интеллектуального Rate Limiting
const ipRegistry = new Map<string, { count: number, lastReset: number, isBanned: boolean }>();

export function middleware(request: NextRequest) {
  const ip = request.ip || 'unknown';
  const userAgent = request.headers.get('user-agent') || '';
  const url = request.nextUrl.pathname + request.nextUrl.search;
  const now = Date.now();

  // 1. ПРОВЕРКА ЧЕРНОГО СПИСКА IP
  const nodeState = ipRegistry.get(ip) || { count: 0, lastReset: now, isBanned: false };
  if (nodeState.isBanned) {
    return new NextResponse('Signal Blocked: IP Permanently Restricted by Aegis', { status: 403 });
  }

  // 2. ANTI-DOS & DDOS (Rate Limiting)
  if (now - nodeState.lastReset > 5000) { // Сброс каждые 5 сек
    nodeState.count = 0;
    nodeState.lastReset = now;
  }
  nodeState.count++;
  
  if (nodeState.count > 20) { // Лимит: 4 запроса в секунду
    console.warn(`[AEGIS] Rate limit exceeded for IP: ${ip}`);
    if (nodeState.count > 100) nodeState.isBanned = true; // Авто-бан при явной атаке
    ipRegistry.set(ip, nodeState);
    return new NextResponse('Rate Limit Exceeded: Cooldown Active', { status: 429 });
  }
  ipRegistry.set(ip, nodeState);

  // 3. DEEP BOT SHIELD
  const suspiciousAgents = [
    'python-requests', 'curl', 'wget', 'headless', 'postman', 'insomnia',
    'selenium', 'playwright', 'puppeteer', 'zgrab', 'masscan', 'nmap'
  ];
  if (!userAgent || userAgent.length < 15 || suspiciousAgents.some(a => userAgent.toLowerCase().includes(a))) {
    return new NextResponse('Signal Blocked: Suspicious Node Activity Detected', { status: 403 });
  }

  // 4. ANTI-INJECTION (SQLi & XSS Patterns)
  const injectionPatterns = [
    'select', 'union', 'insert', 'drop', 'delete', 'truncate', '--', '/*', '*/',
    'javascript:', '<script', 'alert(', 'onerror=', 'onclick=', 'eval('
  ];
  if (injectionPatterns.some(p => url.toLowerCase().includes(p))) {
    return new NextResponse('Signal Blocked: Malicious Payload Detected', { status: 400 });
  }

  // 5. SECURITY HEADERS (Titanium Shell)
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Content-Security-Policy', "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'; img-src 'self' https: data: blob:; media-src 'self' https: data: blob:;");
  response.headers.set('X-Nuxus-Aegis', 'Active-v3.0');

  return response;
}

export const config = {
  matcher: ['/', '/login', '/register', '/api/:path*', '/.well-known/:path*'],
}
