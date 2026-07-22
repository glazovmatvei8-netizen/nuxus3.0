
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * NUXUS KERNEL SHIELD v2.0 (DDoS & Bot Protection)
 * Осуществляет фильтрацию трафика на уровне Edge.
 */

// Простая база для Rate Limiting (в памяти узла)
const ipCache = new Map<string, { count: number, lastReset: number }>();

export function middleware(request: NextRequest) {
  const ip = request.ip || 'unknown';
  const userAgent = request.headers.get('user-agent') || '';
  const acceptHeader = request.headers.get('accept') || '';
  
  // 1. БЛОКИРОВКА ПУСТЫХ USER-AGENT (Типичные боты)
  if (!userAgent || userAgent.length < 10) {
    return new NextResponse('Signal Blocked: Missing Node Identity', { status: 403 });
  }

  // 2. БЛОКИРОВКА ИЗВЕСТНЫХ ИНСТРУМЕНТОВ АТАКИ
  const blacklistedAgents = ['python-requests', 'curl', 'wget', 'headless', 'postman', 'insomnia'];
  if (blacklistedAgents.some(agent => userAgent.toLowerCase().includes(agent))) {
    return new NextResponse('Signal Blocked: Forbidden Tool Detected', { status: 403 });
  }

  // 3. RATE LIMITING (Edge Level)
  const now = Date.now();
  const userData = ipCache.get(ip) || { count: 0, lastReset: now };

  if (now - userData.lastReset > 10000) { // Сброс каждые 10 сек
    userData.count = 0;
    userData.lastReset = now;
  }

  userData.count++;
  ipCache.set(ip, userData);

  // Лимит: 30 запросов за 10 секунд (достаточно для человека, мало для DDoS)
  if (userData.count > 30) {
    return new NextResponse('Rate Limit Exceeded: Node Cooldown Active', { status: 429 });
  }

  // 4. MARKDOWN NEGOTIATION (Agent Support)
  if (acceptHeader && acceptHeader.includes('text/markdown')) {
    const markdown = `
# Nuxus 2.0 — Premium Communication Kernel
Version: 5.8.0 | Protocol: QES 24.1 | Shield: ACTIVE

Nuxus is a quantum-secure messaging environment.

## Node Security
- **Aegis Protection**: DDoS Mitigation active.
- **Quantum Encryption**: Local node-to-node signal encryption.
- **Multi-Node Isolation**: 5 autonomous instances enabled.

Official Node: [https://nuxus.fun](https://nuxus.fun)
    `.trim()

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'X-Markdown-Tokens': '200',
        'X-Nuxus-Shield': 'Active',
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/login', '/register', '/api/:path*', '/.well-known/:path*'],
}
