/**
 * Field mapping engine.
 * Maps raw MSSQL columns → ProcessInstance portal fields using
 * the FieldMapping records configured in the admin panel.
 */

import { ProcessStatus } from '@prisma/client';
import type { LaserficheRecord } from './mssql';

// All portal fields that can be mapped from LF data
export const PORTAL_FIELDS = [
  'status',
  'statusLabel',
  'submissionDate',
  'completionDate',
  'renewalDate',
  'renewalUrl',
  'lfProcessId',
  'lfDocumentEntryId',
  'assignedDepartment',
  'assignedStaffName',
  'applicantName',
  'applicantEmail',
  'businessName',
] as const;

export type PortalField = (typeof PORTAL_FIELDS)[number];

export interface FieldMappingConfig {
  portalField: string;
  externalColumn: string;
}

export interface MappedProcessData {
  status?: ProcessStatus;
  statusLabel?: string;
  submissionDate?: Date | null;
  completionDate?: Date | null;
  renewalDate?: Date | null;
  renewalUrl?: string | null;
  lfProcessId?: string | null;
  lfDocumentEntryId?: string | null;
  assignedDepartment?: string | null;
  assignedStaffName?: string | null;
  applicantName?: string | null;
  applicantEmail?: string | null;
  businessName?: string | null;
  rawData?: Record<string, unknown>;
}

/**
 * Apply field mappings to a raw LF record and return portal update data.
 */
export function applyFieldMappings(
  record: LaserficheRecord,
  mappings: FieldMappingConfig[]
): MappedProcessData {
  const result: MappedProcessData = {};

  // Always store raw data
  result.rawData = record as Record<string, unknown>;

  for (const mapping of mappings) {
    const rawValue = record[mapping.externalColumn];
    if (rawValue === undefined) continue;

    const field = mapping.portalField as PortalField;

    switch (field) {
      case 'status': {
        const mapped = mapStatus(String(rawValue ?? ''));
        if (mapped) result.status = mapped;
        break;
      }
      case 'statusLabel':
        result.statusLabel = String(rawValue ?? '');
        break;
      case 'submissionDate':
        result.submissionDate = parseDate(rawValue);
        break;
      case 'completionDate':
        result.completionDate = parseDate(rawValue);
        break;
      case 'renewalDate':
        result.renewalDate = parseDate(rawValue);
        break;
      case 'renewalUrl':
        result.renewalUrl = rawValue ? String(rawValue) : null;
        break;
      case 'lfProcessId':
        result.lfProcessId = rawValue ? String(rawValue) : null;
        break;
      case 'lfDocumentEntryId':
        result.lfDocumentEntryId = rawValue ? String(rawValue) : null;
        break;
      case 'assignedDepartment':
        result.assignedDepartment = rawValue ? String(rawValue) : null;
        break;
      case 'assignedStaffName':
        result.assignedStaffName = rawValue ? String(rawValue) : null;
        break;
      case 'applicantName':
        result.applicantName = rawValue ? String(rawValue) : null;
        break;
      case 'applicantEmail':
        result.applicantEmail = rawValue ? String(rawValue) : null;
        break;
      case 'businessName':
        result.businessName = rawValue ? String(rawValue) : null;
        break;
    }
  }

  return result;
}

/**
 * Map a Laserfiche status string to our ProcessStatus enum.
 * Covers common LF workflow status labels.
 */
export function mapStatus(raw: string): ProcessStatus | null {
  const s = raw.toLowerCase().trim();
  if (!s) return null;

  if (s.includes('approv') || s.includes('complet') || s.includes('done') || s.includes('issued')) {
    return ProcessStatus.APPROVED;
  }
  if (s.includes('reject') || s.includes('deni') || s.includes('refused')) {
    return ProcessStatus.REJECTED;
  }
  if (s.includes('cancel') || s.includes('void') || s.includes('withdrawn')) {
    return ProcessStatus.CANCELLED;
  }
  if (s.includes('expir')) {
    return ProcessStatus.EXPIRED;
  }
  if (
    s.includes('review') ||
    s.includes('pending') ||
    s.includes('wait') ||
    s.includes('process') ||
    s.includes('progress') ||
    s.includes('submit')
  ) {
    return ProcessStatus.IN_REVIEW;
  }
  // Unknown/draft
  return ProcessStatus.DRAFT;
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? null : d;
}
