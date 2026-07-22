
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * NUXUS KERNEL AGENT HANDLER v1.1
 * Обеспечивает Markdown Negotiation и поддержку метаданных для агентов.
 */
export function middleware(request: NextRequest) {
  const acceptHeader = request.headers.get('accept')
  
  if (acceptHeader && acceptHeader.includes('text/markdown')) {
    const markdown = `
# Nuxus 2.0 — Premium Communication Kernel
Version: 5.8.0 | Protocol: QES 24.1

Nuxus is a quantum-secure messaging environment designed for safe communication.

## Node Features
- **Quantum Encryption (QES 24.1)**: Local node-to-node signal encryption.
- **Multi-Node Isolation**: Up to 5 autonomous instances per kernel.
- **AI Core**: Gemini 1.5 Flash powered voice-to-text transcription.
- **API Discovery**: RFC 9727 compliant api-catalog enabled.

## Endpoints
- **Health**: /api/health
- **Catalog**: /.well-known/api-catalog

Official Node: [https://nuxus.fun](https://nuxus.fun)
    `.trim()

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'X-Markdown-Tokens': '200',
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/login', '/register', '/.well-known/api-catalog'],
}
