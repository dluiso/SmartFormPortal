'use client';

import { Building2, Shield, Globe, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  onNext: () => void;
}

const features = [
  { icon: Globe, text: 'Track Laserfiche processes for your clients' },
  { icon: Shield, text: 'Enterprise-grade security and data privacy' },
  { icon: Zap, text: 'Real-time sync with your Laserfiche SQL database' },
  { icon: Building2, text: 'Multi-department support with role management' },
];

export default function StepWelcome({ onNext }: Props) {
  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">
        Welcome to SmartFormPortal
      </h2>
      <p className="text-slate-500 mb-8 max-w-md mx-auto">
        This wizard will guide you through the initial configuration. This setup page will be
        disabled once installation is complete.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 text-left">
        {features.map((f, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-slate-50 rounded-xl p-3"
          >
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <f.icon className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-sm text-slate-600">{f.text}</span>
          </div>
        ))}
      </div>

      <Button onClick={onNext} size="lg" className="w-full sm:w-auto px-12">
        Start Setup
      </Button>
    </div>
  );
}
