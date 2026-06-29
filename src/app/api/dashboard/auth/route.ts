import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const COOKIE = 'nmq_dash_auth';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const expected = process.env.DASHBOARD_PASSWORD;

  if (!expected) {
    // No password set — open access (dev mode)
    (await cookies()).set(COOKIE, '1', { httpOnly: true, sameSite: 'lax', maxAge: MAX_AGE, path: '/dashboard' });
    return NextResponse.json({ ok: true });
  }

  if (password !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  (await cookies()).set(COOKIE, '1', { httpOnly: true, sameSite: 'lax', maxAge: MAX_AGE, path: '/dashboard' });
  return NextResponse.json({ ok: true });
}
