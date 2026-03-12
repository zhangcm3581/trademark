'use client';

import { useEffect, useState } from 'react';
import TrademarkCard from '@/components/TrademarkCard';
import { getFavorites, getIntlFavorites, removeFavorites, removeIntlFavorites } from '@/lib/favorites';
import type { Trademark, InternationalTrademark } from '@/types';

type TabType = 'favorites';

export default function FavoritesPage() {
  const [tab] = useState<TabType>('favorites');
  const [domesticItems, setDomesticItems] = useState<Trademark[]>([]);
  const [intlItems, setIntlItems] = useState<InternationalTrademark[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchFavorites = async () => {
    setLoading(true);
    const domesticIds = getFavorites();
    const intlIds = getIntlFavorites();

    const results = await Promise.all([
      domesticIds.length > 0
        ? fetch(`/api/trademarks?ids=${domesticIds.join(',')}&pageSize=100`).then(r => r.json())
        : { data: [] },
      intlIds.length > 0
        ? fetch(`/api/international?ids=${intlIds.join(',')}&pageSize=100`).then(r => r.json())
        : { data: [] },
    ]);

    setDomesticItems(results[0].data || []);
    setIntlItems(results[1].data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (tab === 'favorites') {
      fetchFavorites();
    }
  }, [tab]);

  const allItems = [
    ...domesticItems.map(i => ({ ...i, _isIntl: false as const })),
    ...intlItems.map(i => ({ ...i, _isIntl: true as const })),
  ];

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === allItems.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allItems.map(i => i.id)));
    }
  };

  const handleBatchRemove = () => {
    const domesticToRemove = domesticItems.filter(i => selected.has(i.id)).map(i => i.id);
    const intlToRemove = intlItems.filter(i => selected.has(i.id)).map(i => i.id);
    if (domesticToRemove.length) removeFavorites(domesticToRemove);
    if (intlToRemove.length) removeIntlFavorites(intlToRemove);
    setSelected(new Set());
    fetchFavorites();
  };

  return (
    <div>
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <h1 className="text-center py-3 font-bold text-lg">我的收藏</h1>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : allItems.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          暂无收藏
        </div>
      ) : (
        <div
          className="p-3 min-h-screen"
          style={{ background: 'linear-gradient(180deg, #fffef8 0%, #fffefa 30%, #fffefc 60%, #ffffff 100%)' }}
        >
          {allItems.map(item => (
            <div key={item.id} className="flex items-start gap-2">
              <button
                onClick={() => toggleSelect(item.id)}
                className="mt-4 flex-shrink-0"
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selected.has(item.id) ? 'bg-green-500 border-green-500' : 'border-gray-300'
                }`}>
                  {selected.has(item.id) && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </div>
              </button>
              <div className="flex-1">
                <TrademarkCard item={item} isIntl={item._isIntl} />
              </div>
            </div>
          ))}
        </div>
      )}

      {allItems.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-between max-w-lg mx-auto">
          <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              selected.size === allItems.length ? 'bg-green-500 border-green-500' : 'border-gray-300'
            }`}>
              {selected.size === allItems.length && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </div>
            全选
          </button>
          {selected.size > 0 && (
            <button onClick={handleBatchRemove} className="text-sm text-red-500">
              取消收藏 ({selected.size})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
