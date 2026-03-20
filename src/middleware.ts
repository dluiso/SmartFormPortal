import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { getClientIp, isIpInList } from '@/lib/security/ipUtils';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/session';
import { SystemRole } from '@prisma/client';

// ─── Route Classification ─────────────────────────────────────────────────────

const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/2fa',
  '/setup',
  '/maintenance',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/auth/resend-verification',
  '/api/auth/2fa/verify',
  '/api/setup',
  '/api/health',
];

const ADMIN_ROUTES = ['/admin', '/api/admin'];
const STAFF_ROUTES = ['/staff', '/api/staff'];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
}

function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const clientIp = getClientIp(request);

  // Skip Next.js internals and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2)$/)
  ) {
    return NextResponse.next();
  }

  // ── Step 1: Read security settings from headers set by a server component
  // In production, settings are cached in Redis and passed via a custom header
  // For now, we read from cookies set during admin configuration
  const maintenanceMode = request.cookies.get('sfp_maintenance')?.value === 'true';
  const attackMode = request.cookies.get('sfp_attack_mode')?.value === 'true';
  const whitelistRaw = request.cookies.get('sfp_whitelist')?.value;
  const blacklistRaw = request.cookies.get('sfp_blacklist')?.value;
  const blockedCountriesRaw = request.cookies.get('sfp_blocked_countries')?.value;

  const whitelist: string[] = whitelistRaw ? JSON.parse(whitelistRaw) : [];
  const blacklist: string[] = blacklistRaw ? JSON.parse(blacklistRaw) : [];
  const blockedCountries: string[] = blockedCountriesRaw
    ? JSON.parse(blockedCountriesRaw)
    : [];

  // ── Step 2: IP Blacklist check (always active)
  if (blacklist.length > 0 && isIpInList(clientIp, blacklist)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  // ── Step 3: Attack mode — whitelist only
  if (attackMode && whitelist.length > 0) {
    if (!isIpInList(clientIp, whitelist)) {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  // ── Step 4: Country block (via CF-IPCountry header from Cloudflare, or custom)
  const countryCode = request.headers.get('cf-ipcountry') ||
                      request.headers.get('x-country-code') || '';
  if (blockedCountries.length > 0 && countryCode && blockedCountries.includes(countryCode.toUpperCase())) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  // ── Step 5: Maintenance mode
  if (maintenanceMode && !pathname.startsWith('/maintenance')) {
    // Allow admin users through maintenance
    const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
    let isAdmin = false;
    if (token) {
      try {
        const payload = verifyAccessToken(token);
        isAdmin = payload.systemRole === SystemRole.SUPER_ADMIN ||
                  payload.systemRole === SystemRole.ADMIN;
      } catch {
        // Invalid token — not admin
      }
    }
    if (!isAdmin) {
      // Redirect to maintenance page for browser requests, 503 for API
      if (isApiRoute(pathname)) {
        return NextResponse.json(
          { error: 'Service temporarily unavailable', code: 'MAINTENANCE' },
          { status: 503 }
        );
      }
      return NextResponse.redirect(new URL('/maintenance', request.url));
    }
  }

  // ── Step 6: Setup guard — redirect to /setup if not installed
  const isInstalled = request.cookies.get('sfp_installed')?.value === 'true';
  if (!isInstalled && !pathname.startsWith('/setup') && !pathname.startsWith('/api/setup') && !pathname.startsWith('/api/health')) {
    if (isApiRoute(pathname)) {
      return NextResponse.json(
        { error: 'Application not installed', code: 'NOT_INSTALLED' },
        { status: 503 }
      );
    }
    return NextResponse.redirect(new URL('/setup', request.url));
  }

  // ── Step 7: Skip auth for public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // ── Step 8: Authentication check
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    if (isApiRoute(pathname)) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'NOT_AUTHENTICATED' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const payload = verifyAccessToken(token);

    // ── Step 9: Role-based route protection
    if (isAdminRoute(pathname)) {
      if (
        payload.systemRole !== SystemRole.SUPER_ADMIN &&
        payload.systemRole !== SystemRole.ADMIN
      ) {
        if (isApiRoute(pathname)) {
          return NextResponse.json(
            { error: 'Forbidden', code: 'INSUFFICIENT_ROLE' },
            { status: 403 }
          );
        }
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // ── Step 10: Inject user info into request headers for server components
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId);
    requestHeaders.set('x-tenant-id', payload.tenantId);
    requestHeaders.set('x-user-role', payload.systemRole);
    requestHeaders.set('x-user-public-id', payload.publicId);

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    // Token invalid or expired
    const response = isApiRoute(pathname)
      ? NextResponse.json(
          { error: 'Unauthorized', code: 'TOKEN_INVALID' },
          { status: 401 }
        )
      : NextResponse.redirect(new URL('/login', request.url));

    // Clear invalid token
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
