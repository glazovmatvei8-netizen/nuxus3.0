import { NextResponse } from 'next/server';

/**
 * KERNEL HEALTH CHECK v1.1
 * Помечен как статический для совместимости с output: export
 */
export const dynamic = 'force-static';

export async function GET() {
  return NextResponse.json({
    status: "active",
    kernel: "5.9.0",
    protocol: "QES 24.1",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
}
