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
// API routes exempt from CSRF (miners use API keys, not cookies)
const CSRF_EXEMPT = ['/api/miners', '/api/health', '/api/network']

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

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except static files and _next internals
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
