import { NextRequest } from 'next/server';

/**
 * Extracts the real client IP from request headers.
 * Checks X-Forwarded-For, X-Real-IP, then falls back to connection remote address.
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // X-Forwarded-For can be comma-separated; take the first (original client)
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return request.headers.get('x-client-ip') || '0.0.0.0';
}

/**
 * Checks if an IP address matches a CIDR range.
 * Supports both IPv4 and simple IPv4 CIDR notation.
 */
export function ipMatchesCidr(ip: string, cidr: string): boolean {
  if (!cidr.includes('/')) {
    return ip === cidr;
  }

  const [network, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);

  if (isNaN(prefix)) return false;

  try {
    const ipNum = ipToNumber(ip);
    const networkNum = ipToNumber(network);
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    return (ipNum & mask) === (networkNum & mask);
  } catch {
    return false;
  }
}

function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    throw new Error(`Invalid IPv4: ${ip}`);
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/**
 * Checks if an IP is in any of the given CIDR/IP rules.
 */
export function isIpInList(ip: string, rules: string[]): boolean {
  return rules.some((rule) => ipMatchesCidr(ip, rule));
}
