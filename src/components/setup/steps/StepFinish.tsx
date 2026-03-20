'use client';

import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  portalName: string;
  onGoToLogin: () => void;
}

export default function StepFinish({ portalName, onGoToLogin }: Props) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center w-20 h-20 bg-green-600/20 rounded-full mx-auto mb-6">
        <CheckCircle2 className="w-10 h-10 text-green-400" />
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">Setup Complete!</h2>
      <p className="text-slate-400 mb-2">
        <span className="text-blue-400 font-medium">{portalName || 'SmartFormPortal'}</span> has
        been installed successfully.
      </p>
      <p className="text-slate-500 text-sm mb-8">
        You can now sign in with your administrator account and start configuring your portal.
      </p>

      <div className="bg-slate-700/50 rounded-xl p-4 mb-8 text-left space-y-2">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-3">
          Next Steps
        </p>
        {[
          'Sign in with your admin account',
          'Configure your email relay for notifications',
          'Add departments and staff members',
          'Create your first process templates',
          'Activate your license',
        ].map((step, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
            <span className="flex-shrink-0 w-5 h-5 bg-blue-600/30 text-blue-400 rounded-full flex items-center justify-center text-xs">
              {i + 1}
            </span>
            {step}
          </div>
        ))}
      </div>

      <Button onClick={onGoToLogin} size="lg" className="w-full">
        Go to Login
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}
