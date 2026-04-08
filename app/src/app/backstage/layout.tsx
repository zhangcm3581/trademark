'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import TenantBadge from '@/components/backstage/TenantBadge';

const menuItems = [
  {
    href: '/backstage',
    label: '商标列表',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
  },
  {
    href: '/backstage/import',
    label: 'Excel 导入',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
  },
  {
    href: '/backstage/settings',
    label: '系统设置',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === '/backstage/login') {
      setChecking(false);
      setAuthenticated(true);
      return;
    }

    fetch('/api/auth/me')
      .then(res => {
        if (!res.ok) {
          router.replace('/backstage/login');
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data) {
          setAuthenticated(true);
          setUserName(data.username || '');
        }
        setChecking(false);
      })
      .catch(() => {
        router.replace('/backstage/login');
        setChecking(false);
      });
  }, [pathname, router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-blue-400 border-t-transparent" />
      </div>
    );
  }

  if (!authenticated) return null;

  if (pathname === '/backstage/login') {
    return <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">{children}</div>;
  }

  const isActive = (href: string) => {
    if (href === '/backstage') return pathname === '/backstage' || pathname.startsWith('/backstage/edit');
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex text-[13px]">
      <aside className="w-52 bg-slate-900 text-white flex-shrink-0 fixed inset-y-0 left-0 z-30 flex flex-col shadow-xl">
        <div className="px-4 py-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold">商标管理</h1>
              <p className="text-[10px] text-slate-500 leading-none mt-0.5">Trademark Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-3 px-2.5 space-y-0.5">
          <p className="px-2.5 py-1.5 text-[10px] font-medium text-slate-500 uppercase tracking-wider">菜单</p>
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-semibold transition-all ${
                isActive(item.href)
                  ? 'bg-blue-600/90 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-white/5">
          <div className="flex items-center gap-2 px-1">
            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[11px] font-medium text-slate-300">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-300 truncate">{userName}</p>
            </div>
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                router.replace('/backstage/login');
              }}
              title="退出登录"
              className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-red-400 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 ml-52 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 h-12 bg-white border-b border-gray-100 flex items-center justify-end px-5">
          <TenantBadge />
        </header>
        <main className="flex-1 p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
