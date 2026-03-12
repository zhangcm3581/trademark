'use client';

import Link from 'next/link';
import type { Trademark, InternationalTrademark } from '@/types';

interface Props {
  items: (Trademark | InternationalTrademark)[];
  isIntl?: boolean;
}

export default function TrademarkGrid({ items, isIntl = false }: Props) {
  const detailType = isIntl ? 'intl' : 'domestic';

  return (
    <div className="grid grid-cols-4 gap-2 p-3">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/detail/${item.id}?type=${detailType}`}
          className="aspect-square bg-white border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden p-1"
        >
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" />
          ) : (
            <span className="text-xs font-bold text-gray-700 text-center leading-tight">
              {item.name}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
