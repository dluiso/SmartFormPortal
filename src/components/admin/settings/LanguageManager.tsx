'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Download, Upload, CheckCircle2, AlertCircle, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface LanguageFile {
  id: string;
  code: string;
  name: string;
  isDefault: boolean;
  isBuiltIn: boolean;
  isComplete: boolean;
  missingKeys: string[];
  updatedAt: string;
}

interface Props {
  languages: LanguageFile[];
}

const BUILT_IN_CODES = ['en', 'es'];

export default function LanguageManager({ languages: initialLanguages }: Props) {
  const [languages, setLanguages] = useState<LanguageFile[]>(initialLanguages);
  const [importing, setImporting] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [importName, setImportName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [expandedMissing, setExpandedMissing] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = (code: string) => {
    window.open(`/api/admin/settings/language/export?code=${code}`, '_blank');
  };

  const handleImport = async () => {
    if (!selectedFile || !importCode.trim() || !importName.trim()) {
      toast.error('Provide a file, language code, and language name.');
      return;
    }
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('code', importCode.trim().toLowerCase());
      fd.append('name', importName.trim());

      const res = await fetch('/api/admin/settings/language/import', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Import failed');

      toast.success(
        data.isComplete
          ? 'Language file imported — fully complete!'
          : `Language file imported — ${data.missingKeys.length} keys missing.`
      );

      // Refresh language list
      const listRes = await fetch('/api/admin/settings/language');
      if (listRes.ok) {
        const list = await listRes.json();
        setLanguages(list.languages ?? []);
      }

      // Reset form
      setImportCode('');
      setImportName('');
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  // Merge built-in entries that aren't in the DB yet
  const allEntries = [...languages];
  for (const code of BUILT_IN_CODES) {
    if (!allEntries.find((l) => l.code === code)) {
      allEntries.push({
        id: `builtin-${code}`,
        code,
        name: code === 'en' ? 'English' : 'Español',
        isDefault: code === 'en',
        isBuiltIn: true,
        isComplete: true,
        missingKeys: [],
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Existing languages */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/50">
          <Languages className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-white">Available Languages</span>
        </div>

        <div className="divide-y divide-slate-700/30">
          {allEntries.map((lang) => (
            <div key={lang.id}>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-white bg-slate-700 px-2 py-0.5 rounded uppercase">
                    {lang.code}
                  </span>
                  <div>
                    <span className="text-sm text-white">{lang.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {lang.isDefault && (
                        <Badge className="text-xs bg-blue-900/30 text-blue-400 border-blue-700/30">Default</Badge>
                      )}
                      {lang.isBuiltIn && (
                        <Badge className="text-xs bg-slate-700 text-slate-400 border-0">Built-in</Badge>
                      )}
                      {lang.isComplete ? (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <CheckCircle2 className="w-3 h-3" /> Complete
                        </span>
                      ) : (
                        <button
                          onClick={() =>
                            setExpandedMissing(expandedMissing === lang.id ? null : lang.id)
                          }
                          className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
                        >
                          <AlertCircle className="w-3 h-3" />
                          {lang.missingKeys.length} missing
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 hidden sm:block">
                    {formatDistanceToNow(new Date(lang.updatedAt), { addSuffix: true })}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExport(lang.code)}
                    className="h-7 px-2 text-slate-400 hover:text-white hover:bg-slate-700"
                    title="Export as JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Missing keys list */}
              {expandedMissing === lang.id && lang.missingKeys.length > 0 && (
                <div className="px-4 pb-3 ml-12">
                  <div className="bg-slate-900 rounded-lg p-3 max-h-40 overflow-y-auto">
                    {lang.missingKeys.map((key) => (
                      <p key={key} className="text-xs font-mono text-amber-400/80">{key}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Import */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Import Language File</h2>
        <p className="text-xs text-slate-500">
          Export <strong className="text-slate-300">en</strong> as a template, translate the
          values, then import it here. Missing keys fall back to English.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Language Code</label>
            <Input
              value={importCode}
              onChange={(e) => setImportCode(e.target.value)}
              placeholder="fr"
              className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500 font-mono"
              maxLength={5}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Language Name</label>
            <Input
              value={importName}
              onChange={(e) => setImportName(e.target.value)}
              placeholder="Français"
              className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">JSON File</label>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-slate-700 file:text-slate-300 hover:file:bg-slate-600 cursor-pointer"
          />
        </div>

        <Button
          onClick={handleImport}
          disabled={importing || !selectedFile || !importCode.trim() || !importName.trim()}
          size="sm"
        >
          <Upload className="w-3.5 h-3.5 mr-1.5" />
          {importing ? 'Importing...' : 'Import'}
        </Button>
      </div>
    </div>
  );
}
