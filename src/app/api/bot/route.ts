import { NextResponse } from 'next/server';

/**
 * NUXUS BOT API GATEWAY v1.1
 * Помечен как статический для совместимости с output: export
 */
export const dynamic = 'force-static';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer nx_live_')) {
      return NextResponse.json({ error: "Invalid Signal: Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      status: "success",
      message: "Signal processed by Nuxus Kernel",
      timestamp: new Date().toISOString()
    });
  } catch (e) {
<<<<<<< HEAD
=======
    console.error("Signal processing error in bot route:", e);
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
    return NextResponse.json({ error: "Signal processing error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    engine: "Nuxus Bot Gateway",
    version: "2.0.0",
    protocol: "QES 24.1",
    documentation: "https://nuxus.fun/partner"
  });
}
