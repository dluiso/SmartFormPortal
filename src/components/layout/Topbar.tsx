'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { JWTPayload } from '@/lib/auth/jwt';
import { Menu, User, LogOut, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import NotificationBell from './NotificationBell';

interface Props {
  session: JWTPayload;
  onMenuToggle: () => void;
}

export default function Topbar({ session, onMenuToggle }: Props) {
  const t = useTranslations('nav');
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      toast.error('Logout failed. Please try again.');
    }
  };

  return (
    <header className="flex items-center justify-between h-14 px-4 md:px-6 bg-white border-b border-slate-200 flex-shrink-0 shadow-sm">
      {/* Left: Mobile menu toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Right: Notifications + Profile */}
      <div className="flex items-center gap-1">
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all focus:outline-none">
            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-blue-700">
                {session.email.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="hidden md:block text-sm font-medium max-w-[140px] truncate">
              {session.email}
            </span>
            <ChevronDown className="w-3.5 h-3.5 hidden md:block text-slate-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 bg-white border-slate-200 shadow-lg rounded-xl"
          >
            <DropdownMenuItem
              className="text-slate-700 focus:text-slate-900 focus:bg-slate-100 cursor-pointer rounded-lg"
              onClick={() => router.push('/profile')}
            >
              <User className="w-4 h-4 mr-2 text-slate-400" />
              {t('profile')}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer rounded-lg"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
