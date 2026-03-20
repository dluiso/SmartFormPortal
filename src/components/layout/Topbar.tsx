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
    <header className="flex items-center justify-between h-14 px-4 md:px-6 bg-slate-900 border-b border-slate-800 flex-shrink-0">
      {/* Left: Mobile menu button + breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden text-slate-400 hover:text-white transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Right: Notifications + Profile */}
      <div className="flex items-center gap-2">
        <NotificationBell />

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-all focus:outline-none">
            <div className="w-7 h-7 bg-blue-600/20 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-blue-400">
                {session.email.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="hidden md:block text-sm max-w-[120px] truncate">
              {session.email}
            </span>
            <ChevronDown className="w-3 h-3 hidden md:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-slate-800 border-slate-700">
            <DropdownMenuItem className="text-slate-300 focus:text-white focus:bg-slate-700 cursor-pointer" onClick={() => router.push('/profile')}>
              <User className="w-4 h-4 mr-2" />
              {t('profile')}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-400 focus:text-red-300 focus:bg-slate-700 cursor-pointer"
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
