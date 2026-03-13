'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

// 固定显示的 4 个 tab（不依赖接口）
const fixedTabs = [
  { href: '/premium', label: '精品商标', icon: PremiumIcon, key: 'premium' },
  { href: '/international', label: '国际商标', icon: InternationalIcon, key: 'international' },
  { href: '/search', label: '商标搜索', icon: SearchIcon, key: 'search' },
  { href: '/favorites', label: '我的收藏', icon: FavoriteIcon, key: 'favorites' },
];

const discountTab = { href: '/discount', label: '特惠商标', icon: DiscountIcon, key: 'discount' };

export default function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showDiscount, setShowDiscount] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setShowDiscount(data.show_discount_tab !== 'false');
      })
      .catch(() => setShowDiscount(true));
  }, []);

  // 固定 tab 立即渲染，特惠商标等 API 返回 true 后插入到第二位
  const tabs = showDiscount
    ? [fixedTabs[0], discountTab, ...fixedTabs.slice(1)]
    : fixedTabs;

  const getIsActive = (href: string) => {
    if (pathname.startsWith(href)) return true;
    if (pathname === '/list') {
      const type = searchParams.get('type');
      if (href === '/premium' && type === 'premium') return true;
      if (href === '/discount' && type === 'discount') return true;
      if (href === '/international' && type === 'international') return true;
    }
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="max-w-lg mx-auto flex">
        {tabs.map((tab) => {
          const isActive = getIsActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center py-2 text-xs ${
                isActive ? 'text-blue-500' : 'text-gray-500'
              }`}
            >
              <tab.icon active={isActive} />
              <span className="mt-1">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function PremiumIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" stroke={active ? '#3b82f6' : '#6b7280'} strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
    </svg>
  );
}

function DiscountIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" stroke={active ? '#3b82f6' : '#6b7280'} strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  );
}

function InternationalIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" stroke={active ? '#3b82f6' : '#6b7280'} strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 003 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

function SearchIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" stroke={active ? '#3b82f6' : '#6b7280'} strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function FavoriteIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill={active ? '#3b82f6' : 'none'} stroke={active ? '#3b82f6' : '#6b7280'} strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}
