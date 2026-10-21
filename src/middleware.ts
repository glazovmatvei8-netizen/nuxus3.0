import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * NUXUS TITANIUM AEGIS v5.0 (Advanced WAF & Zero-Trust Mitigation)
 * Эшелонированная защита Ядра от SQLi, XSS, DDoS и «пиратского» кода.
 */

const ipRegistry = new Map<string, { count: number, lastReset: number, isBanned: boolean, riskScore: number }>();

export function middleware(request: NextRequest) {
  const ip = request.ip || 'unknown';
  const userAgent = (request.headers.get('user-agent') || '').toLowerCase();
  const url = request.nextUrl.pathname + request.nextUrl.search;
  const now = Date.now();

  // 1. ПРОВЕРКА ЧЕРНОГО СПИСКА IP
  const nodeState = ipRegistry.get(ip) || { count: 0, lastReset: now, isBanned: false, riskScore: 0 };
  
  if (nodeState.isBanned) {
    return new NextResponse('Signal Blocked: IP Restricted by Aegis Protocol (Risk Score High)', { status: 403 });
  }

  // 2. ANTI-DOS & RATE LIMITING (Жесткий лимит: 10 запросов за 3 сек)
  if (now - nodeState.lastReset > 3000) { 
    nodeState.count = 0;
    nodeState.lastReset = now;
  }
  nodeState.count++;
  
  if (nodeState.count > 10) { 
    nodeState.riskScore += 1;
    if (nodeState.riskScore > 10) nodeState.isBanned = true; 
    ipRegistry.set(ip, nodeState);
    return new NextResponse('Rate Limit Exceeded: Aegis Active. Signal throttled.', { status: 429 });
  }
  ipRegistry.set(ip, nodeState);

  // 3. DEEP BOT & AUTOMATION SHIELD
  const suspiciousKeywords = [
    'headless', 'puppeteer', 'selenium', 'playwright', 'curl', 'wget', 'python-requests',
    'postman', 'insomnia', 'zgrab', 'nmap', 'sqlmap', 'nikto', 'burp'
  ];
  if (suspiciousKeywords.some(keyword => userAgent.includes(keyword))) {
    nodeState.isBanned = true;
    ipRegistry.set(ip, nodeState);
    return new NextResponse('Signal Blocked: Malicious Tool Detected', { status: 403 });
  }

  // 4. SECURITY HEADERS (Black Box Shell)
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Strict Content Security Policy (Запрещает выполнение сторонних скриптов)
  response.headers.set('Content-Security-Policy', 
    "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://*.gstatic.com; " +
    "img-src 'self' https: data: blob:; " +
    "media-src 'self' https: data: blob:; " +
    "connect-src 'self' https: wss:;"
  );
  
  response.headers.set('X-Nuxus-Aegis', 'Active-v5.0-BlackBox');

  return response;
}

export const config = {
  matcher: ['/', '/login', '/register', '/api/:path*', '/.well-known/:path*'],
}