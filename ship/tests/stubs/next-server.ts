/**
 * Minimal stand-in for `next/server` so the REAL route handlers can be imported
 * and called without a Next runtime.
 *
 * This is not a reimplementation of Next — it is the two behaviours the routes
 * actually use. The route logic under test is genuine; only the response
 * wrapper is substituted.
 */
export class NextResponse extends Response {
  cookies = {
    set: (name: string, value: string, opts: Record<string, unknown> = {}) => {
      const bits = [`${name}=${value}`, 'Path=' + (opts.path ?? '/')]
      if (opts.httpOnly) bits.push('HttpOnly')
      if (opts.maxAge !== undefined) bits.push(`Max-Age=${opts.maxAge}`)
      this.headers.append('set-cookie', bits.join('; '))
    },
  }

  static json(body: unknown, init: ResponseInit = {}) {
    return new NextResponse(JSON.stringify(body), {
      ...init,
      headers: { 'content-type': 'application/json', ...(init.headers || {}) },
    })
  }
}
