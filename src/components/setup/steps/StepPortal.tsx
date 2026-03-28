'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SetupData } from '../SetupWizard';

interface Props {
  data: SetupData;
  onChange: (d: Partial<SetupData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepPortal({ data, onChange, onNext, onBack }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!data.portalName.trim()) {
      e.portalName = 'Portal name is required.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Portal Configuration</h2>
      <p className="text-slate-500 text-sm mb-6">
        Set the name and domain for your portal. These can be changed later in settings.
      </p>

      <div className="space-y-4 mb-8">
        <div>
          <Label className="text-slate-700 mb-1.5 block">
            Portal Name <span className="text-red-400">*</span>
          </Label>
          <Input
            value={data.portalName}
            onChange={(e) => onChange({ portalName: e.target.value })}
            placeholder="e.g. City Hall Portal, Municipal Services"
            className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500"
          />
          {errors.portalName && (
            <p className="text-red-400 text-xs mt-1">{errors.portalName}</p>
          )}
          <p className="text-slate-500 text-xs mt-1">
            This name will appear in the header and browser tab.
          </p>
        </div>

        <div>
          <Label className="text-slate-700 mb-1.5 block">
            Domain <span className="text-slate-500 font-normal">(optional)</span>
          </Label>
          <Input
            value={data.domain}
            onChange={(e) => onChange({ domain: e.target.value })}
            placeholder="portal.yourdomain.com"
            className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500"
          />
          <p className="text-slate-500 text-xs mt-1">
            Used for license validation and email links.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-100"
        >
          Back
        </Button>
        <Button onClick={handleNext} className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  );
}
