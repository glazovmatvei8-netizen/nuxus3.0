
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * NUXUS KERNEL AGENT HANDLER
 * Возвращает Markdown версию страницы при запросе от AI-агентов.
 */
export function middleware(request: NextRequest) {
  const acceptHeader = request.headers.get('accept')
  
  if (acceptHeader && acceptHeader.includes('text/markdown')) {
    const markdown = `
# Nuxus 2.0 — Premium Communication Kernel

Nuxus is a quantum-secure messaging environment designed for safe and high-fidelity communication.

## Node Features
- **Quantum Encryption (QES 24.1)**: All text signals are encrypted locally on your node.
- **Multi-Node Support**: Up to 5 isolated accounts on a single kernel instance.
- **AI Intelligence**: Integrated Gemini 1.5 Flash for voice transcription and chat summaries.
- **Nuxus Wallet**: Internal NX-token system for gifts and node upgrades.
- **Global Discovery**: Public clusters and verified nodes navigation.

## Technical Stack
- Engine: Next.js 15 (Pulse)
- Logic: Firebase Cloud Backend
- AI Core: Genkit / Gemini 1.5 Flash
- Protocol: QES v24.1

Official Node Access: [https://nuxus.fun](https://nuxus.fun)
    `.trim()

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'X-Markdown-Tokens': '150',
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/login', '/register'],
}
