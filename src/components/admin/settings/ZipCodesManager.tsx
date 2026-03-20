'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, MapPin, ShieldCheck, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface ZipCode {
  id: string;
  zipCode: string;
  city: string | null;
  state: string | null;
}

interface Props {
  initial: ZipCode[];
  initialEnforce: boolean;
}

export default function ZipCodesManager({ initial, initialEnforce }: Props) {
  const [zipCodes, setZipCodes] = useState<ZipCode[]>(initial);
  const [enforce, setEnforce] = useState(initialEnforce);
  const [zipInput, setZipInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [stateInput, setStateInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [togglingEnforce, setTogglingEnforce] = useState(false);

  const handleAdd = async () => {
    const zip = zipInput.trim().toUpperCase();
    if (!zip) return;
    setAdding(true);
    try {
      const res = await fetch('/api/admin/settings/zip-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zipCode: zip, city: cityInput.trim() || undefined, state: stateInput.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed');
      }
      const { zipCode } = await res.json();
      setZipCodes((prev) => [...prev, zipCode].sort((a, b) => a.zipCode.localeCompare(b.zipCode)));
      setZipInput('');
      setCityInput('');
      setStateInput('');
      toast.success(`ZIP code ${zip} added.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not add ZIP code.');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string, zip: string) => {
    try {
      await fetch(`/api/admin/settings/zip-codes/${id}`, { method: 'DELETE' });
      setZipCodes((prev) => prev.filter((z) => z.id !== id));
      toast.success(`ZIP code ${zip} removed.`);
    } catch {
      toast.error('Could not remove ZIP code.');
    }
  };

  const handleToggleEnforce = async () => {
    setTogglingEnforce(true);
    const next = !enforce;
    try {
      const res = await fetch('/api/admin/settings/zip-codes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enforceZipRestriction: next }),
      });
      if (!res.ok) throw new Error();
      setEnforce(next);
      toast.success(next ? 'ZIP restriction enabled.' : 'ZIP restriction disabled.');
    } catch {
      toast.error('Could not update setting.');
    } finally {
      setTogglingEnforce(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Toggle */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Enforce ZIP Code Restriction</p>
            <p className="text-xs text-slate-500 mt-0.5">
              When enabled, only users with an allowed ZIP code may register.
            </p>
          </div>
          <button
            onClick={handleToggleEnforce}
            disabled={togglingEnforce}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              enforce
                ? 'bg-green-600/20 text-green-400 border border-green-700/50 hover:bg-green-600/30'
                : 'bg-slate-700 text-slate-400 border border-slate-600 hover:bg-slate-600'
            }`}
          >
            {enforce ? (
              <><ShieldCheck className="w-4 h-4" /> Enabled</>
            ) : (
              <><ShieldOff className="w-4 h-4" /> Disabled</>
            )}
          </button>
        </div>
      </div>

      {/* Add ZIP */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Add Allowed ZIP Code</h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">ZIP Code *</label>
            <Input
              value={zipInput}
              onChange={(e) => setZipInput(e.target.value)}
              placeholder="90210"
              className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500 font-mono"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">City</label>
            <Input
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder="Beverly Hills"
              className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">State</label>
            <Input
              value={stateInput}
              onChange={(e) => setStateInput(e.target.value)}
              placeholder="CA"
              className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500"
            />
          </div>
        </div>
        <Button onClick={handleAdd} disabled={adding || !zipInput.trim()} size="sm">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          {adding ? 'Adding...' : 'Add ZIP Code'}
        </Button>
      </div>

      {/* List */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
          <span className="text-sm font-semibold text-white">Allowed ZIP Codes</span>
          <Badge className="bg-slate-700 text-slate-400 border-0">{zipCodes.length}</Badge>
        </div>

        {zipCodes.length === 0 ? (
          <div className="py-10 text-center text-slate-600 text-sm">
            No ZIP codes added. All ZIP codes are allowed.
          </div>
        ) : (
          <div className="divide-y divide-slate-700/30 max-h-80 overflow-y-auto">
            {zipCodes.map((z) => (
              <div key={z.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <MapPin className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                  <span className="text-sm font-mono text-white">{z.zipCode}</span>
                  {(z.city || z.state) && (
                    <span className="text-xs text-slate-500">
                      {[z.city, z.state].filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(z.id, z.zipCode)}
                  className="text-slate-600 hover:text-red-400 transition-colors p-1"
                >
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
