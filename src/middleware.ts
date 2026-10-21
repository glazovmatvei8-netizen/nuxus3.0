import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * NUXUS TITANIUM AEGIS v4.0 (Advanced WAF & Zero-Trust Mitigation)
 * Эшелонированная защита Ядра от SQLi, XSS, DDoS и вредоносных ботов.
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

  // 2. ANTI-DOS & RATE LIMITING (15 запросов за 3 сек)
  if (now - nodeState.lastReset > 3000) { 
    nodeState.count = 0;
    nodeState.lastReset = now;
  }
  nodeState.count++;
  
  if (nodeState.count > 15) { 
    nodeState.riskScore += 1;
    if (nodeState.riskScore > 10) nodeState.isBanned = true; 
    ipRegistry.set(ip, nodeState);
    return new NextResponse('Rate Limit Exceeded: Aegis Active. Slow down your signal.', { status: 429 });
  }
  ipRegistry.set(ip, nodeState);

  // 3. DEEP BOT & AUTOMATION SHIELD
  const suspiciousKeywords = [
    'headless', 'puppeteer', 'selenium', 'playwright', 'curl', 'wget', 'python-requests',
    'postman', 'insomnia', 'zgrab', 'nmap', 'masscan', 'sqlmap', 'nikto', 'burp', 'metasploit'
  ];
  if (suspiciousKeywords.some(keyword => userAgent.includes(keyword))) {
    nodeState.isBanned = true;
    ipRegistry.set(ip, nodeState);
    return new NextResponse('Signal Blocked: Non-Human / Malicious Tool Detected', { status: 403 });
  }

  // 4. ANTI-INJECTION (Advanced SQLi, NoSQLi, XSS & Path Traversal)
  const maliciousPatterns = [
    'select ', 'union ', 'insert ', 'drop ', 'delete ', 'truncate', '--', '/*', '*/',
    'javascript:', '<script', 'alert(', 'onerror=', 'onclick=', 'eval(', '$where', '{"$',
    '..%2f', '../', 'etc/passwd', '.env', 'cmd.exe', 'powershell', 'base64', 'concat('
  ];
  const lowerUrl = url.toLowerCase();
  if (maliciousPatterns.some(pattern => lowerUrl.includes(pattern))) {
    nodeState.riskScore += 5;
    if (nodeState.riskScore > 15) nodeState.isBanned = true;
    ipRegistry.set(ip, nodeState);
    return new NextResponse('Signal Blocked: Malicious Payload Rejected', { status: 400 });
  }

  // 5. SECURITY HEADERS (Titanium Shell)
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('Content-Security-Policy', "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'; img-src 'self' https: data: blob:; media-src 'self' https: data: blob:; connect-src 'self' https: wss:;");
  response.headers.set('X-Nuxus-Aegis', 'Active-v4.0');

  return response;
}

export const config = {
  matcher: ['/', '/login', '/register', '/api/:path*', '/.well-known/:path*'],
}