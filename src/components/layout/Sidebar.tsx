'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { SystemRole } from '@prisma/client';
import { JWTPayload } from '@/lib/auth/jwt';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, FileText, FolderOpen, Download, BarChart3,
  MessageSquare, Users, Building2, Database, Settings, Shield,
  Tags, X, ChevronDown, BookOpen, ScrollText,
} from 'lucide-react';
import { useState } from 'react';

interface Props {
  session: JWTPayload;
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

// ── Module-level components (stable identity across renders) ──────────────

interface NavLinkProps {
  item: NavItem;
  active: boolean;
  onClose: () => void;
}

function NavLink({ item, active, onClose }: NavLinkProps) {
  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
        active
          ? 'bg-blue-50 text-blue-700'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      )}
    >
      <item.icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-blue-600' : 'text-slate-400')} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

interface SidebarContentProps {
  session: JWTPayload;
  pathname: string;
  onClose: () => void;
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
  navItems: NavItem[];
  adminItems: NavItem[];
  isAdmin: boolean;
  tAdmin: ReturnType<typeof useTranslations>;
}

function SidebarContent({
  session, pathname, onClose, settingsOpen, setSettingsOpen,
  navItems, adminItems, isAdmin, tAdmin,
}: SidebarContentProps) {
  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const settingsLinks = [
    { label: 'General',       href: '/admin/settings/general' },
    { label: 'Language',      href: '/admin/settings/language' },
    { label: 'Email',         href: '/admin/settings/email' },
    { label: 'Security',      href: '/admin/settings/security' },
    { label: 'Backup',        href: '/admin/settings/backup' },
    { label: 'Customization', href: '/admin/settings/customization' },
    { label: 'License',       href: '/admin/settings/license' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-200">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-slate-900 text-sm truncate">SmartFormPortal</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} onClose={onClose} />
        ))}

        {/* Admin section */}
        {isAdmin && (
          <>
            <div className="pt-5 pb-2 px-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Administration
              </p>
            </div>
            {adminItems.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} onClose={onClose} />
            ))}

            {/* Settings collapsible */}
            <div>
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                  pathname.startsWith('/admin/settings')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                )}
              >
                <Settings className={cn(
                  'w-4 h-4 flex-shrink-0',
                  pathname.startsWith('/admin/settings') ? 'text-blue-600' : 'text-slate-400'
                )} />
                <span className="flex-1 text-left">{tAdmin('settings')}</span>
                <ChevronDown
                  className={cn('w-3 h-3 text-slate-400 transition-transform duration-200', settingsOpen && 'rotate-180')}
                />
              </button>
              {settingsOpen && (
                <div className="ml-7 mt-1 space-y-0.5 border-l-2 border-slate-200 pl-3">
                  {settingsLinks.map((s) => (
                    <Link
                      key={s.href}
                      href={s.href}
                      onClick={onClose}
                      className={cn(
                        'block px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
                        pathname === s.href
                          ? 'text-blue-700 bg-blue-50'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      )}
                    >
                      {s.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </nav>

      {/* User info */}
      <div className="p-3 border-t border-slate-200">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-slate-50">
          <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-blue-700">
              {session.email.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700 truncate">{session.email}</p>
            <p className="text-xs text-slate-400 capitalize">
              {session.systemRole.toLowerCase().replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Sidebar export ────────────────────────────────────────────────────

export default function Sidebar({ session, open, onClose }: Props) {
  const t = useTranslations('nav');
  const tAdmin = useTranslations('admin.nav');
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isAdmin =
    session.systemRole === SystemRole.SUPER_ADMIN ||
    session.systemRole === SystemRole.ADMIN;

  const navItems: NavItem[] = [
    { label: t('dashboard'),    href: '/dashboard',    icon: LayoutDashboard },
    { label: t('processes'),    href: '/processes',    icon: BookOpen },
    { label: t('my_processes'), href: '/my-processes', icon: FolderOpen },
    { label: t('downloads'),    href: '/downloads',    icon: Download },
    { label: t('statistics'),   href: '/statistics',   icon: BarChart3 },
    { label: t('messages'),     href: '/messages',     icon: MessageSquare },
  ];

  const adminItems: NavItem[] = [
    { label: tAdmin('overview'),        href: '/admin',                icon: Shield },
    { label: tAdmin('users'),           href: '/admin/users',          icon: Users },
    { label: tAdmin('departments'),     href: '/admin/departments',    icon: Building2 },
    { label: tAdmin('categories'),      href: '/admin/categories',     icon: Tags },
    { label: tAdmin('processes'),       href: '/admin/processes',      icon: FileText },
    { label: tAdmin('db_connections'),  href: '/admin/db-connections', icon: Database },
    { label: tAdmin('statistics'),      href: '/admin/statistics',     icon: BarChart3 },
    { label: tAdmin('logs'),            href: '/admin/logs',           icon: ScrollText },
  ];

  const contentProps = {
    session, pathname, onClose, settingsOpen, setSettingsOpen,
    navItems, adminItems, isAdmin, tAdmin,
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 shadow-xl transform transition-transform duration-200 ease-in-out lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent {...contentProps} />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-slate-200 flex-shrink-0 shadow-sm">
        <SidebarContent {...contentProps} />
      </div>
    </>
  );
}
