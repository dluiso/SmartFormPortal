'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface BlockedCountry {
  id: string;
  countryCode: string;
  countryName: string;
}

interface Props {
  initial: BlockedCountry[];
}

export default function BlockedCountriesManager({ initial }: Props) {
  const [countries, setCountries] = useState<BlockedCountry[]>(initial);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    const codeVal = code.trim().toUpperCase();
    const nameVal = name.trim();
    if (!codeVal || !nameVal) return;
    setAdding(true);
    try {
      const res = await fetch('/api/admin/settings/blocked-countries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode: codeVal, countryName: nameVal }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      const { country } = await res.json();
      setCountries((prev) => [...prev, country].sort((a, b) => a.countryName.localeCompare(b.countryName)));
      setCode(''); setName('');
      toast.success(`${nameVal} blocked.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not block country.');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string, n: string) => {
    await fetch(`/api/admin/settings/blocked-countries/${id}`, { method: 'DELETE' });
    setCountries((prev) => prev.filter((c) => c.id !== id));
    toast.success(`${n} unblocked.`);
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">Block Country</h3>
        <p className="text-xs text-slate-500">Users from blocked countries cannot access the portal or register. Uses ISO 3166-1 alpha-2 codes.</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Code (2 letters)</label>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="RU"
              maxLength={2}
              className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500 font-mono uppercase" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-slate-500 mb-1">Country Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Russia"
              className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
          </div>
        </div>
        <Button onClick={handleAdd} disabled={adding || !code.trim() || !name.trim()} size="sm">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          {adding ? 'Blocking...' : 'Block Country'}
        </Button>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
          <span className="text-sm font-semibold text-white">Blocked Countries</span>
          <Badge className="bg-slate-700 text-slate-400 border-0">{countries.length}</Badge>
        </div>
        {countries.length === 0 ? (
          <p className="px-4 py-6 text-center text-slate-600 text-sm">No countries blocked</p>
        ) : (
          <div className="divide-y divide-slate-700/30 max-h-72 overflow-y-auto">
            {countries.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <Globe className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                  <span className="text-xs font-mono text-red-400 bg-red-900/20 px-2 py-0.5 rounded">{c.countryCode}</span>
                  <span className="text-sm text-slate-300">{c.countryName}</span>
                </div>
                <button onClick={() => handleDelete(c.id, c.countryName)} className="text-slate-600 hover:text-red-400 transition-colors p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
