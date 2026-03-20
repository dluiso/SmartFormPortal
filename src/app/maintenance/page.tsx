import { cookies } from 'next/headers';
import { Wrench } from 'lucide-react';

export default async function MaintenancePage() {
  const cookieStore = await cookies();
  const message = cookieStore.get('sfp_maintenance_message')?.value;
  const portalName = cookieStore.get('sfp_portal_name')?.value || 'SmartFormPortal';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-600/20 rounded-full mb-6">
          <Wrench className="w-10 h-10 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">{portalName}</h1>
        <h2 className="text-lg font-medium text-amber-400 mb-4">Under Maintenance</h2>
        <p className="text-slate-400">
          {message || 'We are performing scheduled maintenance. We\'ll be back soon.'}
        </p>
        <p className="text-slate-500 text-sm mt-4">
          For urgent inquiries, please contact your administrator.
        </p>
      </div>
    </div>
  );
}
