/**
 * Laserfiche Repository API client.
 * Handles token acquisition with 14-min in-memory cache (LF v1 tokens live 15 min).
 */

import { decrypt } from '@/lib/auth/encryption';

export interface LfConnectionConfig {
  id: string;
  baseUrl: string;
  repositoryId: string;
  apiVersion: string;
  username: string;
  passwordEncrypted: string;
}

interface TokenCache {
  token: string;
  expiresAt: number;
}

const tokenCache = new Map<string, TokenCache>();
const TOKEN_TTL_MS = 14 * 60 * 1000;

export async function getLfAccessToken(conn: LfConnectionConfig): Promise<string> {
  const cached = tokenCache.get(conn.id);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const password = decrypt(conn.passwordEncrypted);
  const version = conn.apiVersion === 'v2' ? 'v2' : 'v1';
  const tokenUrl = `${conn.baseUrl.replace(/\/$/, '')}/${version}/Repositories/${encodeURIComponent(conn.repositoryId)}/Token`;

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'password', username: conn.username, password }).toString(),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`LF auth failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json() as { access_token?: string };
  if (!data.access_token) throw new Error('LF token response missing access_token');

  tokenCache.set(conn.id, { token: data.access_token, expiresAt: Date.now() + TOKEN_TTL_MS });
  return data.access_token;
}

export async function testLfConnection(conn: LfConnectionConfig): Promise<{ success: boolean; error?: string }> {
  tokenCache.delete(conn.id);
  try {
    await getLfAccessToken(conn);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Fetch a document from LF repository.
 * Tries native edoc first, falls back to image-export-as-PDF.
 * Returns a fetch Response whose body can be piped to the browser.
 */
export async function fetchLfDocument(conn: LfConnectionConfig, entryId: string): Promise<Response> {
  const token = await getLfAccessToken(conn);
  const version = conn.apiVersion === 'v2' ? 'v2' : 'v1';
  const base = `${conn.baseUrl.replace(/\/$/, '')}/${version}/Repositories/${encodeURIComponent(conn.repositoryId)}`;
  const authHeader = { Authorization: `Bearer ${token}` };

  // Try native edoc (original stored file)
  const edocUrl = `${base}/Entries/${encodeURIComponent(entryId)}/Laserfiche.Repository.Document/edoc`;
  const edocRes = await fetch(edocUrl, { headers: authHeader });
  if (edocRes.ok) return edocRes;

  // Fallback: export as PDF
  const exportUrl = `${base}/Entries/${encodeURIComponent(entryId)}/Export`;
  const exportRes = await fetch(exportUrl, {
    method: 'POST',
    headers: { ...authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ part: 'Image', imageOptions: { format: 'PDF', includeAnnotations: true } }),
  });

  if (!exportRes.ok) {
    const body = await exportRes.text().catch(() => '');
    throw new Error(`LF export failed (${exportRes.status}): ${body.slice(0, 200)}`);
  }

  const exportData = await exportRes.json() as { value?: string };
  if (exportData.value) {
    const dlRes = await fetch(exportData.value, { headers: authHeader });
    if (!dlRes.ok) throw new Error(`LF download link failed (${dlRes.status})`);
    return dlRes;
  }

  throw new Error('LF export did not return a usable download URL');
}
