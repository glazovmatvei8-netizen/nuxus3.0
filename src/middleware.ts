import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * NUXUS TITANIUM AEGIS v3.5 (Advanced WAF & DoS Mitigation)
 * Централизованная система защиты Ядра от SQLi, XSS и DDoS.
 */

const ipRegistry = new Map<string, { count: number, lastReset: number, isBanned: boolean }>();

export function middleware(request: NextRequest) {
  const ip = request.ip || 'unknown';
  const userAgent = (request.headers.get('user-agent') || '').toLowerCase();
  const url = request.nextUrl.pathname + request.nextUrl.search;
  const now = Date.now();

  // 1. ПРОВЕРКА ЧЕРНОГО СПИСКА IP
  const nodeState = ipRegistry.get(ip) || { count: 0, lastReset: now, isBanned: false };
  if (nodeState.isBanned) {
    return new NextResponse('Signal Blocked: IP Restricted by Aegis Protocol', { status: 403 });
  }

  // 2. ANTI-DOS & Rate Limiting (25 запросов за 5 сек)
  if (now - nodeState.lastReset > 5000) { 
    nodeState.count = 0;
    nodeState.lastReset = now;
  }
  nodeState.count++;
  
  if (nodeState.count > 25) { 
    if (nodeState.count > 100) nodeState.isBanned = true; 
    ipRegistry.set(ip, nodeState);
    return new NextResponse('Rate Limit Exceeded: Aegis Protection Active', { status: 429 });
  }
  ipRegistry.set(ip, nodeState);

  // 3. DEEP BOT & HEADLESS SHIELD
  const suspiciousKeywords = [
    'headless', 'puppeteer', 'selenium', 'playwright', 'curl', 'wget', 'python-requests',
    'postman', 'insomnia', 'zgrab', 'nmap', 'masscan'
  ];
  if (suspiciousKeywords.some(keyword => userAgent.includes(keyword))) {
    return new NextResponse('Signal Blocked: Non-Human Node Detected', { status: 403 });
  }

  // 4. ANTI-INJECTION (SQLi, NoSQLi & XSS Patterns)
  const maliciousPatterns = [
    'select ', 'union ', 'insert ', 'drop ', 'delete ', 'truncate', '--', '/*', '*/',
    'javascript:', '<script', 'alert(', 'onerror=', 'onclick=', 'eval(', '$where', '{"$',
    '..%2f', '../'
  ];
  const lowerUrl = url.toLowerCase();
  if (maliciousPatterns.some(pattern => lowerUrl.includes(pattern))) {
    return new NextResponse('Signal Blocked: Malicious Payload Rejected', { status: 400 });
  }

  // 5. SECURITY HEADERS (Titanium Shell)
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Content-Security-Policy', "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'; img-src 'self' https: data: blob:; media-src 'self' https: data: blob:;");
  response.headers.set('X-Nuxus-Aegis', 'Active-v3.5');

  return response;
}

export const config = {
  matcher: ['/', '/login', '/register', '/api/:path*', '/.well-known/:path*'],
}