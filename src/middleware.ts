import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, isIpInList } from '@/lib/security/ipUtils';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/session';
import { SystemRole } from '@prisma/client';

// Edge Runtime-compatible JWT verification (jsonwebtoken requires Node.js crypto)
async function verifyJWT(token: string, secret: string): Promise<{ userId: string; tenantId: string; email: string; systemRole: SystemRole; publicId: string }> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');
  const [headerB64, payloadB64, sigB64] = parts;

  const pad = (s: string) => s + '='.repeat((4 - s.length % 4) % 4);
  const fromB64Url = (s: string) => s.replace(/-/g, '+').replace(/_/g, '/');

  const keyData = new TextEncoder().encode(secret);
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);

  const sigBytes = Uint8Array.from(atob(pad(fromB64Url(sigB64))), (c) => c.charCodeAt(0));
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, data);
  if (!valid) throw new Error('Invalid signature');

  const payload = JSON.parse(atob(pad(fromB64Url(payloadB64))));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
  if (payload.iss !== 'smartformportal') throw new Error('Invalid issuer');

  return payload;
}

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
        const secret = process.env.JWT_SECRET ?? '';
        const payload = await verifyJWT(token, secret);
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
  const isSetupPath = pathname.startsWith('/setup') || pathname.startsWith('/api/setup') || pathname.startsWith('/api/health');
  let isInstalled = request.cookies.get('sfp_installed')?.value === 'true';

  if (!isInstalled && !isSetupPath) {
    // Cookie missing (e.g. different browser/PC) — verify against DB via setup API
    try {
      const res = await fetch(new URL('/api/setup', request.url), {
        signal: AbortSignal.timeout(3000),
      });
      const data = await res.json() as { isInstalled: boolean };
      isInstalled = data.isInstalled;
    } catch {
      isInstalled = false;
    }
  }

  if (!isInstalled && !isSetupPath) {
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
    const secret = process.env.JWT_SECRET ?? '';
    const payload = await verifyJWT(token, secret);

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
