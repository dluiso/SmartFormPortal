import { redirect } from 'next/navigation';
import prisma from '@/lib/db/prisma';
import SetupWizard from '@/components/setup/SetupWizard';

export default async function SetupPage() {
  // If already installed, redirect to login
  try {
    const config = await prisma.systemConfig.findFirst();
    if (config?.isInstalled) {
      redirect('/login');
    }
  } catch {
    // DB not reachable yet — allow wizard to show (it will handle DB setup errors)
  }

  return <SetupWizard />;
}
