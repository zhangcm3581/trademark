'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import TrademarkCard from '@/components/TrademarkCard';
import TrademarkGrid from '@/components/TrademarkGrid';
import { CATEGORY_NAMES, getCategoryIcon, COUNTRY_FLAGS } from '@/lib/constants';
import type { Trademark, InternationalTrademark } from '@/types';

function ListContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'premium';
  const category = searchParams.get('category');
  const country = searchParams.get('country');

  const isIntl = type === 'international';

  const [items, setItems] = useState<(Trademark | InternationalTrademark)[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const fetchData = useCallback(async (pageNum: number) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(pageNum));
    params.set('pageSize', '20');

    if (isIntl) {
      if (country) params.set('country', country);
    } else {
      params.set('type', type);
      if (category) params.set('category', category);
    }

    const endpoint = isIntl ? '/api/international' : '/api/trademarks';
    const res = await fetch(`${endpoint}?${params}`);
    const json = await res.json();

    const newData = json.data || [];
    if (pageNum === 1) {
      setItems(newData);
    } else {
      setItems(prev => [...prev, ...newData]);
    }
    setTotal(json.total || 0);
    setLoading(false);

    // 预加载图片
    newData.forEach((item: Trademark | InternationalTrademark) => {
      if (!item.image_url) {
        const img = new Image();
        img.src = `/api/${isIntl ? 'international' : 'trademarks'}/${item.id}/image`;
      }
    });
  }, [type, category, country, isIntl]);

  useEffect(() => {
    setPage(1);
    setItems([]);
    fetchData(1);
  }, [fetchData]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchData(next);
  };

  const remaining = total - items.length;

  let title = '';
  let headerIcon: string | null = null;
  if (isIntl && country) {
    title = country;
    headerIcon = COUNTRY_FLAGS[country] || null;
  } else if (category) {
    title = `第${category}类`;
    headerIcon = getCategoryIcon(parseInt(category));
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: isIntl ? '#fdeaea' : type === 'premium' ? '#ffe8e8' : '#dceefb' }}>
      <header className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-gray-100 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => history.back()} className="text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="flex items-center gap-2 text-base text-gray-800">
            商标列表 {title} {total > 0 && `${total} 个`}
            {headerIcon && (
              isIntl
                ? <span className="text-2xl">{headerIcon}</span>
                : <img src={headerIcon} alt="" className="w-8 h-8 object-contain" />
            )}
          </h1>
          <button
            onClick={() => setViewMode(v => v === 'list' ? 'grid' : 'list')}
            className="p-1 rounded text-blue-400"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </button>
        </div>
      </header>

      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          暂无数据
        </div>
      ) : viewMode === 'list' ? (
        <div className="p-3">
          {items.map(item => (
            <TrademarkCard key={item.id} item={item} isIntl={isIntl} />
          ))}
        </div>
      ) : (
        <TrademarkGrid items={items} isIntl={isIntl} />
      )}

      {remaining > 0 && (
        <div className="text-center py-4">
          <button
            onClick={loadMore}
            disabled={loading}
            className="text-blue-500 text-sm"
          >
            {loading ? '加载中...' : `加载更多（剩余 ${remaining} 件商标未加载）`}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ListPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    }>
      <ListContent />
    </Suspense>
  );
}
