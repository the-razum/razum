import { NextRequest, NextResponse } from 'next/server'

// Routes that require authentication
const PROTECTED_ROUTES = ['/admin', '/account']
// Routes that should redirect to /chat if already logged in
const AUTH_ROUTES = ['/login', '/register']

// API routes that require CSRF token for state-changing methods
const CSRF_API_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/chat',
  '/api/admin',
  '/api/account',
]
// API routes exempt from CSRF (miners use API keys, payment callbacks come from Robokassa servers)
const CSRF_EXEMPT = ['/api/miners', '/api/health', '/api/network', '/api/payment/callback', '/api/payment/webhook', '/api/v1']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get('razum_token')?.value

  // --- CSRF Protection for state-changing API requests ---
  if (pathname.startsWith('/api/') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    // Check if exempt
    const isExempt = CSRF_EXEMPT.some(r => pathname.startsWith(r))
    if (!isExempt) {
      const origin = req.headers.get('origin')
      const host = req.headers.get('host')
      // Verify Origin header matches our host (simple CSRF check)
      if (origin) {
        const originHost = new URL(origin).host
        if (originHost !== host) {
          return NextResponse.json(
            { error: 'Запрос отклонён (CSRF)' },
            { status: 403 }
          )
        }
      }
      // Also check Referer as fallback
      const referer = req.headers.get('referer')
      if (!origin && referer) {
        try {
          const refHost = new URL(referer).host
          if (refHost !== host) {
            return NextResponse.json(
              { error: 'Запрос отклонён (CSRF)' },
              { status: 403 }
            )
          }
        } catch {
          // Invalid referer — block
          return NextResponse.json(
            { error: 'Запрос отклонён' },
            { status: 403 }
          )
        }
      }
    }
  }

  // --- Route protection ---
  // Protected routes: redirect to login if no token
  if (PROTECTED_ROUTES.some(r => pathname.startsWith(r))) {
    if (!token) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Auth routes: redirect to chat if already has token
  if (AUTH_ROUTES.some(r => pathname === r)) {
    if (token) {
      return NextResponse.redirect(new URL('/chat', req.url))
    }
  }

  // --- Security: block suspicious patterns ---
  // Block path traversal attempts
  if (pathname.includes('..') || pathname.includes('%2e%2e')) {
    return new NextResponse('Not Found', { status: 404 })
  }


  // --- CORS Headers ---
  const response = NextResponse.next()
  const origin = req.headers.get("origin") || ""
  const allowedOrigins = [
    "https://airazum.com",
    "https://www.airazum.com",
    "http://localhost:3000",
  ]
  if (allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin)
  }
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")
  response.headers.set("Access-Control-Max-Age", "86400")
  // === Comprehensive Security Headers ===
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(self), geolocation=(), payment=(self)")
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin")
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin")
  // CSP — strict but functional. 'unsafe-inline' for styles (Tailwind) and scripts (Next), 'self' for everything else
  response.headers.set("Content-Security-Policy", [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://mc.yandex.ru",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://airazum.com https://mc.yandex.ru wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join('; '))

  // Handle preflight
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 200, headers: response.headers })
  }

  return response
}

export const config = {
  matcher: [
    // Match all paths except static files and _next internals
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
