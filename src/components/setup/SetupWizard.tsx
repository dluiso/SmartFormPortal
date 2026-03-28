'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Server, Users, CheckCircle2, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import StepWelcome from './steps/StepWelcome';
import StepTenancy from './steps/StepTenancy';
import StepPortal from './steps/StepPortal';
import StepAdmin from './steps/StepAdmin';
import StepFinish from './steps/StepFinish';

export type SetupData = {
  tenancyMode: 'SINGLE' | 'MULTI';
  portalName: string;
  domain: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPassword: string;
  adminConfirmPassword: string;
};

const STEPS = [
  { id: 0, label: 'Welcome', icon: CheckCircle2 },
  { id: 1, label: 'Mode', icon: Building2 },
  { id: 2, label: 'Portal', icon: Server },
  { id: 3, label: 'Admin', icon: Users },
  { id: 4, label: 'Done', icon: CheckCircle2 },
];

const initialData: SetupData = {
  tenancyMode: 'SINGLE',
  portalName: '',
  domain: '',
  adminFirstName: '',
  adminLastName: '',
  adminEmail: '',
  adminPassword: '',
  adminConfirmPassword: '',
};

export default function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<SetupData>(initialData);
  const [loading, setLoading] = useState(false);
  const [installed, setInstalled] = useState(false);

  const updateData = (partial: Partial<SetupData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  const handleNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleFinish = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenancyMode: data.tenancyMode,
          portalName: data.portalName,
          domain: data.domain || undefined,
          adminFirstName: data.adminFirstName,
          adminLastName: data.adminLastName,
          adminEmail: data.adminEmail,
          adminPassword: data.adminPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Setup failed');
        return;
      }

      setInstalled(true);
      setStep(4);
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const stepComponents = [
    <StepWelcome key="welcome" onNext={handleNext} />,
    <StepTenancy key="tenancy" data={data} onChange={updateData} onNext={handleNext} onBack={handleBack} />,
    <StepPortal key="portal" data={data} onChange={updateData} onNext={handleNext} onBack={handleBack} />,
    <StepAdmin key="admin" data={data} onChange={updateData} onFinish={handleFinish} onBack={handleBack} loading={loading} />,
    <StepFinish key="finish" portalName={data.portalName} onGoToLogin={() => router.push('/login')} />,
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">SmartFormPortal</h1>
          <p className="text-slate-500 text-sm mt-1">Initial Setup</p>
        </div>

        {/* Step Indicator */}
        {step < 4 && (
          <div className="flex items-center justify-center mb-8">
            {STEPS.slice(0, 4).map((s, idx) => (
              <div key={s.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all duration-300 ${
                    idx < step
                      ? 'bg-blue-600 text-white'
                      : idx === step
                      ? 'bg-blue-600 text-white ring-4 ring-blue-600/30'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {idx < step ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    idx + 1
                  )}
                </div>
                {idx < 3 && (
                  <div
                    className={`w-16 h-0.5 mx-1 transition-all duration-300 ${
                      idx < step ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Card */}
        <div className="bg-white backdrop-blur border border-slate-200 rounded-2xl overflow-hidden shadow-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="p-8"
            >
              {stepComponents[step]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
