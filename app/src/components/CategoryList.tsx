'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CATEGORY_NAMES, getCategoryIcon } from '@/lib/constants';
import type { CategoryCount } from '@/types';

const ALL_CATEGORIES = Array.from({ length: 45 }, (_, i) => i + 1);

interface Props {
  type: 'premium' | 'discount';
}

export default function CategoryList({ type }: Props) {
  const [countMap, setCountMap] = useState<Record<number, number>>({});

  useEffect(() => {
    fetch(`/api/trademarks/categories?type=${type}`)
      .then(res => res.json())
      .then((data: CategoryCount[]) => {
        const map: Record<number, number> = {};
        data.forEach(({ category, count }) => { map[category] = count; });
        setCountMap(map);
      })
      .catch(() => {});
  }, [type]);

  return (
    <div className="min-h-screen px-3 py-3 space-y-2 bg-gray-50">
      {ALL_CATEGORIES.map(category => {
        const count = countMap[category];
        return (
          <Link
            key={category}
            href={`/list?type=${type}&category=${category}`}
            className="flex items-center px-4 py-3 bg-white rounded-xl shadow-sm border border-gray-100 active:bg-gray-50 transition-all hover:shadow-md"
          >
            <img src={getCategoryIcon(category)} alt="" className="w-10 h-10 object-contain" />
            <span className="ml-3 flex-1 text-base text-gray-900">
              {category} 类
              <span className="ml-3">{CATEGORY_NAMES[category] || `第${category}类`}</span>
            </span>
            <span className="text-blue-500 font-bold">
              {count !== undefined ? (
                <>{count} <span className="text-sm font-bold">件</span></>
              ) : (
                <span className="text-gray-300 text-sm font-normal">--</span>
              )}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
