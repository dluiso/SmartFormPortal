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

  console.log('[LF-FETCH] entryId:', JSON.stringify(entryId), '| base:', base);

  // Try native edoc (original stored file)
  const edocUrl = `${base}/Entries/${encodeURIComponent(entryId)}/Laserfiche.Repository.Document/edoc`;
  const edocRes = await fetch(edocUrl, { headers: authHeader });
  if (edocRes.ok) {
    const ct = (edocRes.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('application/json')) {
      // Read the body to verify it's non-empty (entries without an electronic
      // document return 200 with 0 bytes — fall through to Export in that case)
      const buf = await edocRes.arrayBuffer();
      if (buf.byteLength > 0) {
        return new Response(buf, { status: 200, headers: edocRes.headers });
      }
      // Empty body — entry has no edoc, fall through to Export API
    }
  }

  // Fallback: export as PDF via Export API
  // LF Repository API v1 self-hosted requires a 'file' property in the body
  // (used internally when LF creates the export output entry in the repo)
  const exportUrl = `${base}/Entries/${encodeURIComponent(entryId)}/Export`;
  const exportBody = {
    part: 'Image',
    imageOptions: { format: 'PDF', includeAnnotations: true },
    // LF v1 self-hosted requires a 'file' property — try as string first
    file: `export_${entryId}`,
  };
  console.log('[LF-EXPORT] POST', exportUrl, JSON.stringify(exportBody));
  const exportRes = await fetch(exportUrl, {
    method: 'POST',
    headers: { ...authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify(exportBody),
  });

  if (!exportRes.ok) {
    const body = await exportRes.text().catch(() => '');
    throw new Error(`LF export failed (${exportRes.status}): ${body.slice(0, 600)}`);
  }

  // Export v1 returns JSON with an operation token; poll until ready
  const exportData = await exportRes.json() as { token?: string; value?: string };

  // v2 style: direct URL in "value"
  if (exportData.value) {
    const dlRes = await fetch(exportData.value, { headers: authHeader });
    if (!dlRes.ok) throw new Error(`LF download link failed (${dlRes.status})`);
    const dlCt = (dlRes.headers.get('content-type') || '').toLowerCase();
    if (dlCt.includes('application/json')) {
      const body = await dlRes.text().catch(() => '');
      throw new Error(`LF returned JSON instead of document: ${body.slice(0, 300)}`);
    }
    return dlRes;
  }

  // v1 style: operation token — poll for completion
  if (exportData.token) {
    const operationUrl = `${base}/Tasks/${encodeURIComponent(exportData.token)}`;
    let attempts = 0;
    while (attempts < 15) {
      await new Promise(r => setTimeout(r, 2000));
      attempts++;
      const taskRes = await fetch(operationUrl, { headers: authHeader });
      if (!taskRes.ok) throw new Error(`LF export task poll failed (${taskRes.status})`);
      const taskData = await taskRes.json() as { status?: string; resourceUrl?: string; percentComplete?: number };
      if (taskData.status === 'Completed' && taskData.resourceUrl) {
        const dlRes = await fetch(taskData.resourceUrl, { headers: authHeader });
        if (!dlRes.ok) throw new Error(`LF download link failed (${dlRes.status})`);
        const dlCt = (dlRes.headers.get('content-type') || '').toLowerCase();
        if (dlCt.includes('application/json')) {
          const body = await dlRes.text().catch(() => '');
          throw new Error(`LF returned JSON instead of document: ${body.slice(0, 300)}`);
        }
        return dlRes;
      }
      if (taskData.status === 'Failed') {
        throw new Error('LF export task failed on server side');
      }
    }
    throw new Error('LF export task timed out after 30 seconds');
  }

  throw new Error('LF export did not return a usable download URL or operation token');
}
