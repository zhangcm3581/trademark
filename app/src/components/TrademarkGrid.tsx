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
          <img
            src={item.image_url || `/api/${isIntl ? 'international' : 'trademarks'}/${item.id}/image`}
            alt={item.name}
            decoding="async"
            width={80}
            height={80}
            className="w-full h-full object-contain"
            onError={(e) => {
              const el = e.currentTarget;
              el.style.display = 'none';
              if (el.nextElementSibling) return;
              const span = document.createElement('span');
              span.className = 'text-xs font-bold text-gray-700 text-center leading-tight';
              span.textContent = item.name;
              el.parentElement!.appendChild(span);
            }}
          />
        </Link>
      ))}
    </div>
  );
}
