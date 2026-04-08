'use client';

import Link from 'next/link';
import type { Trademark, InternationalTrademark } from '@/types';
import { PREMIUM_PRICE_THRESHOLD } from '@/lib/constants';
import FavoriteButton from './FavoriteButton';
import { usePublicSettings } from './SettingsProvider';

interface Props {
  item: Trademark | InternationalTrademark;
  isIntl?: boolean;
}

export default function TrademarkCard({ item, isIntl = false }: Props) {
  const { showPrice } = usePublicSettings();
  const detailType = isIntl ? 'intl' : 'domestic';
  const isPremium = item.price >= PREMIUM_PRICE_THRESHOLD;
  const priceText = item.price > 0 ? `¥${Number(item.price).toLocaleString()}` : '面议';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3">
      <Link href={`/detail/${item.id}?type=${detailType}`}>
        <div className="flex items-center">
          <div className="w-28 h-28 flex-shrink-0 bg-gray-50 border border-gray-100 rounded flex items-center justify-center overflow-hidden">
            <img
              src={item.image_url || `/api/${isIntl ? 'international' : 'trademarks'}/${item.id}/image`}
              alt={item.name}
              decoding="async"
              width={112}
              height={112}
              className="w-full h-full object-contain"
              onError={(e) => {
                const el = e.currentTarget;
                el.style.display = 'none';
                if (el.nextElementSibling) return;
                const span = document.createElement('span');
                span.className = 'text-xl font-bold text-gray-700 text-center leading-tight px-1';
                span.textContent = item.name;
                el.parentElement!.appendChild(span);
              }}
            />
          </div>
          <div className="flex-1 ml-3 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium text-base">
                【{item.category}类】{item.name}
              </h3>
              <FavoriteButton id={item.id} isIntl={isIntl} />
            </div>
            <div className="mt-1 text-xs text-gray-800 space-y-0.5">
              {showPrice && (
                <p>
                  <span className="inline-block w-16 text-right mr-1">价格：</span>
                  <span className={isPremium ? 'text-amber-600' : 'text-red-500'}>{priceText}</span>
                </p>
              )}
              <p><span className="inline-block w-16 text-right mr-1">注册号：</span>{item.trademark_no}</p>
              <p><span className="inline-block w-16 text-right mr-1">申请日期：</span>{item.registration_date}</p>
              <p><span className="inline-block w-16 text-right mr-1">有效至期：</span>{item.valid_from}至{item.valid_to}</p>
              {'remark' in item && (() => {
                const remark = (item as Trademark).remark || '';
                const match = remark.match(/同名多[类]?[：:;；]?([\d;；,，\s]+)/);
                if (match) {
                  const cats = match[1].trim().replace(/[;，,\s]+/g, '；').replace(/；$/, '');
                  return <p><span className="inline-block w-16 text-right mr-1">多类包含：</span>{cats}</p>;
                }
                return <p><span className="inline-block w-16 text-right mr-1">多类包含：</span>{item.category}</p>;
              })()}
              {'country' in item && (
                <p><span className="inline-block w-16 text-right mr-1">国家/地区：</span>{(item as InternationalTrademark).country}</p>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
