'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import FavoriteButton from '@/components/FavoriteButton';
import { usePublicSettings } from '@/components/SettingsProvider';
import { CATEGORY_NAMES, PREMIUM_PRICE_THRESHOLD } from '@/lib/constants';
import type { Trademark, InternationalTrademark } from '@/types';

function DetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const type = searchParams.get('type') || 'domestic';
  const isIntl = type === 'intl';
  const { showPrice } = usePublicSettings();

  const [item, setItem] = useState<Trademark | InternationalTrademark | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const endpoint = isIntl ? `/api/international/${id}` : `/api/trademarks/${id}`;
    fetch(endpoint)
      .then(res => res.json())
      .then(data => {
        setItem(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, isIntl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        商标不存在
      </div>
    );
  }

  const products = isIntl
    ? (item as InternationalTrademark).cn_items
    : (item as Trademark).products_services;
  const productList = products
    ? products.split(/[；;，,]/).filter(Boolean).map(s => s.trim())
    : [];

  return (
    <div>
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => history.back()} className="text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="font-bold text-base">{item.name} 商标详情</h1>
          <FavoriteButton id={item.id} isIntl={isIntl} size="md" />
        </div>
      </header>

      <div className="mx-4 mt-4">
        <div className="flex items-center justify-center bg-gray-50 p-8 rounded-lg border border-gray-100" style={{ minHeight: 200 }}>
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="max-h-52 object-contain" />
          ) : (
            <span className="text-4xl font-bold text-gray-700">{item.name}</span>
          )}
        </div>
      </div>

      <div className="py-4">
        <p className="text-lg font-bold text-center mb-3">
          {item.name} （第 {item.category} 类）
        </p>
        <div className="flex justify-center">
          <div className="space-y-1 text-sm">
            {showPrice && (
              <p className="flex items-baseline">
                <span className="inline-block w-28 text-right mr-1 text-gray-700 whitespace-nowrap">价格：</span>
                <span className={`font-bold ${item.price >= PREMIUM_PRICE_THRESHOLD ? 'text-amber-600' : 'text-red-500'}`}>
                  {item.price > 0 ? `¥${Number(item.price).toLocaleString()}` : '面议'}
                </span>
              </p>
            )}
            <p className="flex">
              <span className="inline-block w-28 text-right mr-1 text-gray-700 whitespace-nowrap">注册号：</span>
              <span className="text-gray-700">{item.trademark_no}</span>
            </p>
            <p className="flex">
              <span className="inline-block w-28 text-right mr-1 text-gray-700 whitespace-nowrap">申请日期：</span>
              <span className="text-gray-700">{item.registration_date}</span>
            </p>
            <p className="flex">
              <span className="inline-block w-28 text-right mr-1 text-gray-700 whitespace-nowrap">有效期：</span>
              <span className="text-gray-700 font-medium">{item.valid_from}至{item.valid_to}</span>
            </p>
            <p className="flex">
              <span className="inline-block w-28 text-right mr-1 text-gray-700 whitespace-nowrap">客服经理电话：</span>
              <a href="tel:18324413945" className="text-blue-600 font-medium">
                18324413945
              </a>
            </p>
            {isIntl && (
              <p className="flex">
                <span className="inline-block w-28 text-right mr-1 text-gray-700 whitespace-nowrap">国家/地区：</span>
                <span className="text-gray-700">{(item as InternationalTrademark).country}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {productList.length > 0 && (
        <div className="mx-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-bold text-base">核定商品</h2>
            <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded">
              {item.category} 类
            </span>
          </div>
          <div className="border-t-2 border-orange-400 pt-2">
            <ol className="divide-y divide-gray-100">
              {productList.map((p, i) => (
                <li key={i} className="py-2.5 px-1 text-sm text-gray-700">
                  {i + 1}. {p}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    }>
      <DetailContent />
    </Suspense>
  );
}
