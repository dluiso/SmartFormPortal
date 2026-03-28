'use client';

import { Building2, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SetupData } from '../SetupWizard';
import { cn } from '@/lib/utils';

interface Props {
  data: SetupData;
  onChange: (d: Partial<SetupData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const options = [
  {
    value: 'SINGLE' as const,
    icon: Building2,
    title: 'Single Institution',
    description:
      'One installation serves one institution. All users and processes belong to the same organization. Recommended for most users.',
    badge: 'Recommended',
  },
  {
    value: 'MULTI' as const,
    icon: Building,
    title: 'Multi-Tenant',
    description:
      'Support multiple institutions in one installation. Each tenant is fully isolated with their own users, processes, and settings.',
    badge: 'Advanced',
  },
];

export default function StepTenancy({ data, onChange, onNext, onBack }: Props) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Deployment Mode</h2>
      <p className="text-amber-400 text-sm mb-6 bg-amber-400/10 border border-amber-400/20 rounded-lg px-4 py-2">
        ⚠️ This setting is permanent and cannot be changed after installation.
      </p>

      <div className="space-y-3 mb-8">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange({ tenancyMode: opt.value })}
            className={cn(
              'w-full text-left border rounded-xl p-4 transition-all duration-200',
              data.tenancyMode === opt.value
                ? 'border-blue-500 bg-blue-600/10 ring-2 ring-blue-500/30'
                : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
            )}
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                  data.tenancyMode === opt.value
                    ? 'bg-blue-600'
                    : 'bg-slate-200'
                )}
              >
                <opt.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-slate-900">{opt.title}</span>
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      opt.value === 'SINGLE'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-purple-500/20 text-purple-400'
                    )}
                  >
                    {opt.badge}
                  </span>
                </div>
                <p className="text-sm text-slate-500">{opt.description}</p>
              </div>
              <div
                className={cn(
                  'flex-shrink-0 w-5 h-5 rounded-full border-2 mt-0.5 transition-all',
                  data.tenancyMode === opt.value
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-slate-300'
                )}
              />
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-100">
          Back
        </Button>
        <Button onClick={onNext} className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  );
}
