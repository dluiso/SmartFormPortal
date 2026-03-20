import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/db/prisma';

function isAdmin(role: string) {
  return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

/**
 * GET /api/admin/settings/language/export?code=en
 * Returns the JSON content of a language file as a downloadable attachment.
 * If a tenant-custom LanguageFile record exists it takes precedence over the
 * built-in messages file; otherwise the built-in file is served.
 */
export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id') || '';
  const userRole = req.headers.get('x-user-role') || '';
  if (!isAdmin(userRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const code = new URL(req.url).searchParams.get('code') ?? 'en';

  // Check for a tenant-custom override first
  const custom = await prisma.languageFile.findFirst({
    where: { tenantId, code },
    select: { content: true, name: true },
  });

  let content: unknown;
  if (custom) {
    content = custom.content;
  } else {
    // Fall back to the built-in messages file
    const filePath = path.join(process.cwd(), 'src', 'messages', `${code}.json`);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: `Language '${code}' not found` }, { status: 404 });
    }
    content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  const json = JSON.stringify(content, null, 2);
  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${code}.json"`,
    },
  });
}
