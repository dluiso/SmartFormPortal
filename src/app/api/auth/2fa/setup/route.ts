/**
 * GET /api/auth/2fa/setup
 * Returns a new TOTP secret and QR code URI for the authenticated user.
 * Does NOT enable 2FA — user must verify with /api/auth/2fa/enable.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/session';
import prisma from '@/lib/db/prisma';
import { generateTotpSecret, buildTotpUri } from '@/lib/auth/totp';
import { encrypt } from '@/lib/auth/encryption';
import QRCode from 'qrcode';

export async function GET(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? '';
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, twoFactorEnabled: true },
    });

    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (user.twoFactorEnabled) {
      return NextResponse.json({ error: '2FA is already enabled' }, { status: 409 });
    }

    const secret = generateTotpSecret();
    const uri = buildTotpUri(secret, user.email);

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(uri, { errorCorrectionLevel: 'M', width: 256 });

    // Store the pending secret (encrypted) so /enable can retrieve it
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: encrypt(secret) },
    });

    return NextResponse.json({ otpauthUri: uri, qrDataUrl });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
