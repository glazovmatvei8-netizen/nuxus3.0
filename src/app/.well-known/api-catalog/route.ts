
import { NextResponse } from 'next/server';

/**
 * NUXUS API CATALOG v1.0 (RFC 9727)
 * Обеспечивает автоматическое обнаружение API для AI-агентов и ботов.
 */
export async function GET() {
  const catalog = {
    "linkset": [
      {
        "anchor": "https://nuxus.fun/api",
        "service-desc": [
          {
            "href": "https://nuxus.fun/openapi.json",
            "type": "application/openapi+json;version=3.1"
          }
        ],
        "service-doc": [
          {
            "href": "https://nuxus.fun/docs"
          }
        ],
        "status": [
          {
            "href": "https://nuxus.fun/api/health"
          }
        ]
      }
    ]
  };

  return new NextResponse(JSON.stringify(catalog), {
    headers: {
      'Content-Type': 'application/linkset+json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
