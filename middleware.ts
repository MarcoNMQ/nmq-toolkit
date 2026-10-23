import { NextRequest, NextResponse } from 'next/server';

// Temporary: only Media Plan Builder should be reachable while a link is
// being shared externally. Remove this block to bring the other tools back.
const TEMPORARILY_DISABLED_PREFIXES = ['/campaign-builder', '/dashboard', '/insights'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (TEMPORARILY_DISABLED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const homeUrl = req.nextUrl.clone();
    homeUrl.pathname = '/';
    homeUrl.search = '';
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/campaign-builder/:path*', '/insights/:path*'],
};
