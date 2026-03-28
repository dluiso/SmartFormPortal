import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { validateTenantLicense } from '@/lib/license/validator';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/session';
import { makeLicenseCookieValue, LICENSE_COOKIE_NAME } from '@/lib/license/cookieCache';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? '';
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (payload.systemRole !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = await validateTenantLicense(payload.tenantId);
  const cookieValue = await makeLicenseCookieValue(status.valid, process.env.JWT_SECRET ?? '');
  const response = NextResponse.json(status);
  response.cookies.set(LICENSE_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 3600,
  });
  return response;
}
