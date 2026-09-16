import { NextResponse, type NextRequest } from 'next/server'
import { STAFF_COOKIE, verifySession, staffAuthConfigured } from '@/lib/staff-session'

/**
 * Gates every staff surface.
 *
 * Fails CLOSED: if STAFF_PIN or STAFF_SESSION_SECRET is missing, /kitchen is
 * unreachable rather than open. An unconfigured deployment should be visibly
 * broken to staff, not invisibly public to everyone else.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname === '/kitchen/login') return NextResponse.next()

  if (!staffAuthConfigured()) {
    const url = req.nextUrl.clone()
    url.pathname = '/kitchen/login'
    url.searchParams.set('setup', '1')
    return NextResponse.redirect(url)
  }

  const ok = await verifySession(req.cookies.get(STAFF_COOKIE)?.value)
  if (ok) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = '/kitchen/login'
  url.searchParams.set('next', pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/kitchen/:path*', '/admin/:path*'],
}
