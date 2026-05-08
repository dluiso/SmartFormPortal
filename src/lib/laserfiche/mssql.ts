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
 * Query the Laserfiche MSSQL table for a given portal_instance_id.
 * This is the primary lookup used by the sync engine — each ProcessInstance
 * has a unique UUID that LF stores in the portal_instance_id column, so we
 * always get back the exact row for that submission.
 * Returns null if no record found, throws on connection/query errors.
 */
export async function queryByPortalInstanceId(
  conn: DbConnection,
  portalInstanceId: string
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
    const result = await pool
      .request()
      .input('portalInstanceId', mssql.default.NVarChar(255), portalInstanceId)
      .query(`SELECT TOP 1 * FROM [${escapeIdentifier(conn.tableName)}] WHERE portal_instance_id = @portalInstanceId`);

    if (result.recordset.length === 0) return null;
    return result.recordset[0] as LaserficheRecord;
  } finally {
    await pool.close();
  }
}

/**
 * Query the Laserfiche MSSQL table for a given portal_user_id.
 * @deprecated Use queryByPortalInstanceId for precise per-submission lookups.
 * Kept for backward compatibility with pre-portal_instance_id rows.
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
