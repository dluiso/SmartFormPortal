'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PORTAL_FIELDS, type PortalField } from '@/lib/laserfiche/fieldMapper';

interface DbConnection {
  id: string;
  name: string;
  tableName: string;
}

interface FieldMapping {
  id: string;
  portalField: string;
  externalColumn: string;
  label: string | null;
  dbConnectionId: string;
}

interface MappingRow {
  portalField: PortalField;
  externalColumn: string;
  label: string;
  dbConnectionId: string;
}

interface Props {
  templateId: string;
  templateName: string;
  currentDbConnectionId: string | null;
  dbConnections: DbConnection[];
  fieldMappings: FieldMapping[];
}

const PORTAL_FIELD_LABELS: Record<PortalField, string> = {
  status: 'Status',
  statusLabel: 'Status Label (display)',
  submissionDate: 'Submission Date',
  completionDate: 'Completion Date',
  renewalDate: 'Renewal Date',
  renewalUrl: 'Renewal URL',
  lfProcessId: 'LF Process ID',
  lfDocumentEntryId: 'LF Document Entry ID',
  assignedDepartment: 'Assigned Department',
  assignedStaffName: 'Assigned Staff Name',
  applicantName: 'Applicant Name',
  applicantEmail: 'Applicant Email',
  businessName: 'Business Name',
};

export default function FieldMappingsManager({
  templateId,
  templateName,
  currentDbConnectionId,
  dbConnections,
  fieldMappings: initialMappings,
}: Props) {
  const defaultDbConnectionId =
    currentDbConnectionId ?? dbConnections[0]?.id ?? '';

  const [rows, setRows] = useState<MappingRow[]>(
    initialMappings.map((m) => ({
      portalField: m.portalField as PortalField,
      externalColumn: m.externalColumn,
      label: m.label ?? '',
      dbConnectionId: m.dbConnectionId,
    }))
  );
  const [saving, setSaving] = useState(false);

  const usedFields = new Set(rows.map((r) => r.portalField));

  const addRow = () => {
    const available = PORTAL_FIELDS.find((f) => !usedFields.has(f));
    if (!available) {
      toast.info('All portal fields are already mapped.');
      return;
    }
    setRows((prev) => [
      ...prev,
      { portalField: available, externalColumn: '', label: '', dbConnectionId: defaultDbConnectionId },
    ]);
  };

  const updateRow = (index: number, changes: Partial<MappingRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...changes } : r)));
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const invalid = rows.filter((r) => !r.externalColumn.trim() || !r.dbConnectionId);
    if (invalid.length > 0) {
      toast.error('All rows must have a column name and a DB connection.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/process-templates/${templateId}/field-mappings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mappings: rows.map((r) => ({
            portalField: r.portalField,
            externalColumn: r.externalColumn.trim(),
            label: r.label.trim() || undefined,
            dbConnectionId: r.dbConnectionId,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Save failed');
      }

      toast.success('Field mappings saved.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not save mappings.');
    } finally {
      setSaving(false);
    }
  };

  const availableForRow = (current: PortalField) =>
    PORTAL_FIELDS.filter((f) => f === current || !usedFields.has(f));

  return (
    <div className="space-y-6">
      {/* Info card */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
        <p>
          Map each <span className="text-slate-900 font-medium">portal field</span> to the
          corresponding <span className="text-slate-900 font-medium">column name</span> in your
          Laserfiche MSSQL table. The sync engine uses these mappings to update this process&apos;s
          status and data automatically.
        </p>
        {dbConnections.length === 0 && (
          <p className="mt-2 text-amber-700">
            No active DB connections found. Add one in{' '}
            <a href="/admin/db-connections" className="underline">
              DB Connections
            </a>{' '}
            first.
          </p>
        )}
      </div>

      {/* Mappings table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-0 text-xs text-slate-500 font-medium uppercase tracking-wider px-4 py-2.5 border-b border-slate-200">
          <span>Portal Field</span>
          <span>MSSQL Column</span>
          <span>DB Connection</span>
          <span />
        </div>

        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-600 text-sm">
            No mappings configured. Add one below.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {rows.map((row, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-center px-4 py-3"
              >
                {/* Portal field selector */}
                <div>
                  <select
                    value={row.portalField}
                    onChange={(e) =>
                      updateRow(idx, { portalField: e.target.value as PortalField })
                    }
                    className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    {availableForRow(row.portalField).map((f) => (
                      <option key={f} value={f}>
                        {PORTAL_FIELD_LABELS[f]}
                      </option>
                    ))}
                  </select>
                  {row.portalField === 'status' && (
                    <Badge className="mt-1 text-xs bg-blue-100 text-blue-700 border-0">
                      Auto-mapped to enum
                    </Badge>
                  )}
                </div>

                {/* External column */}
                <Input
                  value={row.externalColumn}
                  onChange={(e) => updateRow(idx, { externalColumn: e.target.value })}
                  placeholder="e.g. ProcessStatus"
                  className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 h-8 text-sm"
                />

                {/* DB connection */}
                <select
                  value={row.dbConnectionId}
                  onChange={(e) => updateRow(idx, { dbConnectionId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {dbConnections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.tableName})
                    </option>
                  ))}
                </select>

                {/* Remove */}
                <button
                  onClick={() => removeRow(idx)}
                  className="text-slate-600 hover:text-red-400 transition-colors p-1"
                  title="Remove mapping"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={addRow}
          disabled={usedFields.size >= PORTAL_FIELDS.length}
          className="border-slate-300 text-slate-600 hover:bg-slate-100"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Mapping
        </Button>

        <Button
          onClick={handleSave}
          disabled={saving}
          size="sm"
          className="min-w-[100px]"
        >
          <Save className="w-3.5 h-3.5 mr-1.5" />
          {saving ? 'Saving...' : 'Save All'}
        </Button>
      </div>
    </div>
  );
}
