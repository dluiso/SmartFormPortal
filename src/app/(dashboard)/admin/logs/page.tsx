import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import ActivityLogsTable from '@/components/admin/ActivityLogsTable';

export default async function ActivityLogsPage() {
  const headersList = await headers();
  const userRole = headersList.get('x-user-role') || '';

  if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Activity Logs</h1>
        <p className="text-slate-400 text-sm mt-1">
          Full audit trail of all user and system actions.
        </p>
      </div>
      <ActivityLogsTable />
    </div>
  );
}
