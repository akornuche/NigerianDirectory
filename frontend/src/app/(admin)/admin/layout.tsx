'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ChartBarIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  ClipboardDocumentListIcon,
  EnvelopeIcon,
  HomeIcon,
  ArrowRightOnRectangleIcon,
  KeyIcon,
  NewspaperIcon,
} from '@heroicons/react/24/outline';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const navItems = [
  { href: '/admin',             label: 'Overview',           icon: ChartBarIcon },
  { href: '/admin/page-health', label: 'Page Health',        icon: DocumentTextIcon },
  { href: '/admin/submissions', label: 'Form Submissions',   icon: EnvelopeIcon },
  { href: '/admin/schools',     label: 'Records & queue',    icon: AcademicCapIcon },
  { href: '/admin/claims',      label: 'Ownership Requests', icon: ClipboardDocumentListIcon },
  { href: '/admin/news',        label: 'News review',        icon: NewspaperIcon },
  { href: '/admin/account',     label: 'Change password',    icon: KeyIcon },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();

  // 'loading' = haven't checked yet, 'ok' = authenticated, 'denied' = not authenticated
  const [authState, setAuthState] = useState<'loading' | 'ok' | 'denied'>('loading');
  const [adminName, setAdminName] = useState('Admin');

  useEffect(() => {
    // Login page never needs auth check
    if (pathname?.startsWith('/admin/login')) {
      setAuthState('ok');
      return;
    }
    const token = localStorage.getItem('auth_token');
    const role  = localStorage.getItem('auth_role');
    const name  = localStorage.getItem('auth_name');
    if (!token || role !== 'admin') {
      setAuthState('denied');
      router.replace('/admin/login');
      return;
    }
    if (name) setAdminName(name);
    setAuthState('ok');
  }, [pathname, router]);

  const handleLogout = async () => {
    const token = localStorage.getItem('auth_token');
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* ignore */ }
    ['auth_token', 'auth_role', 'auth_name', 'auth_email'].forEach(k => localStorage.removeItem(k));
    router.replace('/admin/login');
  };

  // Login page — no sidebar, just render children
  if (pathname?.startsWith('/admin/login')) {
    return <>{children}</>;
  }

  // While checking auth, show a minimal spinner (not blank)
  if (authState === 'loading' || authState === 'denied') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col flex-shrink-0 fixed inset-y-0 left-0 z-10">
        <div className="px-5 py-5 border-b border-gray-700">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Admin</span>
          <div className="text-white font-bold text-lg mt-0.5">NigerianDirectory</div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const active = pathname === item.href || pathname === item.href + '/';
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-green-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-gray-700 space-y-1">
          <div className="px-3 py-2 text-xs text-gray-400">
            Signed in as <span className="text-gray-200 font-medium">{adminName}</span>
          </div>
          <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white text-sm transition-colors">
            <HomeIcon className="h-4 w-4" />
            Back to site
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-red-400 text-sm transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content — offset by sidebar width */}
      <main className="flex-1 ml-56 overflow-auto min-h-screen">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
