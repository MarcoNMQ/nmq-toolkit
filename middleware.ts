import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect /dashboard (but not /dashboard/login or /api/dashboard/auth)
  if (
    pathname.startsWith('/dashboard') &&
    !pathname.startsWith('/dashboard/login') &&
    !pathname.startsWith('/api/dashboard/auth')
  ) {
    const auth = req.cookies.get('nmq_dash_auth');
    const pwRequired = !!process.env.DASHBOARD_PASSWORD;

    if (pwRequired && !auth) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = '/dashboard/login';
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
