import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * NUXUS TITANIUM AEGIS v5.5 «BLACK BOX PROTECTOR»
 * Эшелонированная защита Ядра и принудительный HTTPS.
 */

const ipRegistry = new Map<string, { count: number, lastReset: number, isBanned: boolean, riskScore: number }>();

export function middleware(request: NextRequest) {
  const ip = request.ip || 'unknown';
  const userAgent = (request.headers.get('user-agent') || '').toLowerCase();
  const now = Date.now();

  // 1. ПРИНУДИТЕЛЬНЫЙ HTTPS REDIRECT
  if (request.nextUrl.protocol === 'http:' && !request.nextUrl.hostname.includes('localhost')) {
    return NextResponse.redirect(
      `https://${request.nextUrl.hostname}${request.nextUrl.pathname}${request.nextUrl.search}`,
      301
    );
  }

  // 2. ПРОВЕРКА ЧЕРНОГО СПИСКА IP
  const nodeState = ipRegistry.get(ip) || { count: 0, lastReset: now, isBanned: false, riskScore: 0 };
  
  if (nodeState.isBanned) {
    return new NextResponse('Signal Blocked: IP Restricted by Aegis Protocol', { status: 403 });
  }

  // 3. ANTI-DOS (Лимит: 10 запросов за 3 сек)
  if (now - nodeState.lastReset > 3000) { 
    nodeState.count = 0;
    nodeState.lastReset = now;
  }
  nodeState.count++;
  
  if (nodeState.count > 10) { 
    nodeState.riskScore += 1;
    if (nodeState.riskScore > 10) nodeState.isBanned = true; 
    ipRegistry.set(ip, nodeState);
    return new NextResponse('Rate Limit Exceeded', { status: 429 });
  }
  ipRegistry.set(ip, nodeState);

  // 4. SECURITY HEADERS & BLACK BOX SHELL
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  
  // Strict CSP (Запрещает выполнение сторонних и встроенных скриптов для защиты от инъекций)
  response.headers.set('Content-Security-Policy', 
    "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://*.gstatic.com; " +
    "img-src 'self' https: data: blob:; " +
    "media-src 'self' https: data: blob:; " +
    "connect-src 'self' https: wss:;"
  );
  
  response.headers.set('X-Nuxus-Aegis', 'Active-v5.5-BlackBox');

  return response;
}

export const config = {
  matcher: ['/', '/login', '/register', '/api/:path*', '/.well-known/:path*'],
}
