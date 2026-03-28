'use client';

import { useState } from 'react';
import { JWTPayload } from '@/lib/auth/jwt';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

interface Props {
  session: JWTPayload;
  children: React.ReactNode;
}

export default function DashboardShell({ session, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar
        session={session}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          session={session}
          onMenuToggle={() => setSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
