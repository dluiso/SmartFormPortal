'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, ShieldCheck, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface IpRule {
  id: string;
  ipOrCidr: string;
  isWhitelist: boolean;
  description: string | null;
}

interface Props {
  initial: IpRule[];
}

export default function IpRulesManager({ initial }: Props) {
  const [rules, setRules] = useState<IpRule[]>(initial);
  const [ip, setIp] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState<'whitelist' | 'blacklist'>('blacklist');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    const ipVal = ip.trim();
    if (!ipVal) return;
    setAdding(true);
    try {
      const res = await fetch('/api/admin/settings/ip-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ipOrCidr: ipVal, isWhitelist: type === 'whitelist', description: desc.trim() || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      const { rule } = await res.json();
      setRules((prev) => [...prev, rule]);
      setIp(''); setDesc('');
      toast.success(`${type === 'whitelist' ? 'Whitelist' : 'Blacklist'} rule added.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not add rule.');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/settings/ip-rules/${id}`, { method: 'DELETE' });
    setRules((prev) => prev.filter((r) => r.id !== id));
    toast.success('Rule removed.');
  };

  const whitelisted = rules.filter((r) => r.isWhitelist);
  const blacklisted = rules.filter((r) => !r.isWhitelist);

  return (
    <div className="space-y-5">
      {/* Add form */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">Add IP Rule</h3>
        <p className="text-xs text-slate-500">Supports single IPs (192.168.1.1) or CIDR ranges (10.0.0.0/8).</p>

        <div className="flex gap-2">
          {(['blacklist', 'whitelist'] as const).map((t) => (
            <button key={t} onClick={() => setType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                type === t ? (t === 'blacklist'
                  ? 'border-red-300 bg-red-100 text-red-700'
                  : 'border-green-300 bg-green-100 text-green-700')
                : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}>
              {t === 'blacklist' ? <><ShieldOff className="w-3 h-3 inline mr-1" />Blacklist</> : <><ShieldCheck className="w-3 h-3 inline mr-1" />Whitelist</>}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="IP or CIDR"
            className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 font-mono"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)"
            className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500" />
        </div>

        <Button onClick={handleAdd} disabled={adding || !ip.trim()} size="sm">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          {adding ? 'Adding...' : 'Add Rule'}
        </Button>
      </div>

      {/* Lists */}
      {[
        { label: 'Blacklisted IPs', items: blacklisted, color: 'text-red-700', bg: 'bg-red-100' },
        { label: 'Whitelisted IPs', items: whitelisted, color: 'text-green-700', bg: 'bg-green-100' },
      ].map(({ label, items, color, bg }) => (
        <div key={label} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <span className="text-sm font-semibold text-slate-900">{label}</span>
            <Badge className="bg-slate-100 text-slate-500 border-0">{items.length}</Badge>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-slate-600 text-sm">None configured</p>
          ) : (
            <div className="divide-y divide-slate-200">
              {items.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-mono ${color} ${bg} px-2 py-0.5 rounded`}>{r.ipOrCidr}</span>
                    {r.description && <span className="text-xs text-slate-500">{r.description}</span>}
                  </div>
                  <button onClick={() => handleDelete(r.id)} className="text-slate-600 hover:text-red-400 transition-colors p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
