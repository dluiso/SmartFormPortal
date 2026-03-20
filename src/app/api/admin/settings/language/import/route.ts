import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

function isAdmin(role: string) {
  return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

/**
 * POST /api/admin/settings/language/import
 * Body: multipart/form-data with fields: file (JSON), code, name
 *
 * Validates structure against the built-in en.json reference,
 * records which keys are missing, then upserts a LanguageFile record.
 */
export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id') || '';
  const userRole = req.headers.get('x-user-role') || '';
  if (!isAdmin(userRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const code = (formData.get('code') as string | null)?.trim().toLowerCase();
  const name = (formData.get('name') as string | null)?.trim();

  if (!file || !code || !name) {
    return NextResponse.json({ error: 'file, code and name are required.' }, { status: 400 });
  }

  let imported: Record<string, unknown>;
  try {
    const text = await file.text();
    imported = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON file.' }, { status: 400 });
  }

  // Load reference (en.json) to check completeness
  const refPath = path.join(process.cwd(), 'src', 'messages', 'en.json');
  const reference: Record<string, unknown> = JSON.parse(fs.readFileSync(refPath, 'utf-8'));

  const missingKeys = findMissingKeys(reference, imported, '');
  const isComplete = missingKeys.length === 0;

  const contentJson = imported as Prisma.InputJsonValue;
  await prisma.languageFile.upsert({
    where: { tenantId_code: { tenantId, code } },
    create: {
      tenantId,
      code,
      name,
      content: contentJson,
      isBuiltIn: false,
      isComplete,
      missingKeys,
    },
    update: {
      name,
      content: contentJson,
      isComplete,
      missingKeys,
    },
  });

  return NextResponse.json({ ok: true, isComplete, missingKeys });
}

function findMissingKeys(
  ref: Record<string, unknown>,
  target: Record<string, unknown>,
  prefix: string
): string[] {
  const missing: string[] = [];
  for (const key of Object.keys(ref)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (!(key in target)) {
      missing.push(fullKey);
    } else if (
      typeof ref[key] === 'object' &&
      ref[key] !== null &&
      !Array.isArray(ref[key]) &&
      typeof target[key] === 'object' &&
      target[key] !== null
    ) {
      missing.push(
        ...findMissingKeys(
          ref[key] as Record<string, unknown>,
          target[key] as Record<string, unknown>,
          fullKey
        )
      );
    }
  }
  return missing;
}
