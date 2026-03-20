/**
 * MSSQL connection layer for Laserfiche database queries.
 * Each DbConnection record stores credentials encrypted with AES-256-CBC.
 */

import type { DbConnection } from '@prisma/client';
import { decrypt } from '@/lib/auth/encryption';

export interface LaserficheRecord {
  [column: string]: string | number | boolean | Date | null;
}

/**
 * Query the Laserfiche MSSQL table for a given portal_user_id.
 * Returns null if no record found, throws on connection/query errors.
 */
export async function queryByPortalUserId(
  conn: DbConnection,
  portalUserId: string
): Promise<LaserficheRecord | null> {
  const mssql = await import('mssql');
  const password = decrypt(conn.passwordEncrypted);

  const pool = await mssql.default.connect({
    server: conn.serverAddress,
    port: conn.port ?? 1433,
    database: conn.databaseName,
    user: conn.username,
    password,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      connectTimeout: 10000,
      requestTimeout: 15000,
    },
  });

  try {
    // Parameterized query — no SQL injection risk
    const result = await pool
      .request()
      .input('portalUserId', mssql.default.NVarChar(255), portalUserId)
      .query(`SELECT TOP 1 * FROM [${escapeIdentifier(conn.tableName)}] WHERE portal_user_id = @portalUserId ORDER BY 1 DESC`);

    if (result.recordset.length === 0) return null;
    return result.recordset[0] as LaserficheRecord;
  } finally {
    await pool.close();
  }
}

/**
 * Fetch multiple records for a given portal_user_id (for multi-process tenants).
 */
export async function queryAllByPortalUserId(
  conn: DbConnection,
  portalUserId: string
): Promise<LaserficheRecord[]> {
  const mssql = await import('mssql');
  const password = decrypt(conn.passwordEncrypted);

  const pool = await mssql.default.connect({
    server: conn.serverAddress,
    port: conn.port ?? 1433,
    database: conn.databaseName,
    user: conn.username,
    password,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      connectTimeout: 10000,
      requestTimeout: 15000,
    },
  });

  try {
    const result = await pool
      .request()
      .input('portalUserId', mssql.default.NVarChar(255), portalUserId)
      .query(`SELECT * FROM [${escapeIdentifier(conn.tableName)}] WHERE portal_user_id = @portalUserId`);

    return result.recordset as LaserficheRecord[];
  } finally {
    await pool.close();
  }
}

/**
 * Test connectivity — used by admin DB connection test button.
 */
export async function testConnection(conn: DbConnection): Promise<{ success: boolean; error?: string }> {
  const mssql = await import('mssql');
  const password = decrypt(conn.passwordEncrypted);

  try {
    const pool = await mssql.default.connect({
      server: conn.serverAddress,
      port: conn.port ?? 1433,
      database: conn.databaseName,
      user: conn.username,
      password,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        connectTimeout: 8000,
        requestTimeout: 5000,
      },
    });
    await pool.request().query('SELECT 1 AS ping');
    await pool.close();
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Safely escape SQL Server identifier names (table names) */
function escapeIdentifier(name: string): string {
  return name.replace(/]/g, ']]');
}
