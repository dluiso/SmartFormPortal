import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { verifyRefreshToken } from '@/lib/auth/jwt';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      // Invalidate the session in DB
      await prisma.userSession.deleteMany({
        where: { token: payload.sessionId, userId: payload.userId },
      });
    } catch {
      // Token invalid — proceed with clearing cookies anyway
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
  return response;
}
