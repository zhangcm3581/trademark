'use client';

import { useState } from 'react';
import TrademarkCard from '@/components/TrademarkCard';
import { CATEGORY_NAMES } from '@/lib/constants';
import type { Trademark, InternationalTrademark } from '@/types';

const ALL_CATEGORIES = Array.from({ length: 45 }, (_, i) => i + 1);

export default function SearchPage() {
  const [selectedCategories, setSelectedCategories] = useState<number[]>([...ALL_CATEGORIES]);
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<(Trademark | InternationalTrademark)[]>([]);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);

    const allResults: (Trademark | InternationalTrademark)[] = [];
    let totalCount = 0;

    const categoriesParam = selectedCategories.length < 45
      ? selectedCategories.sort((a, b) => a - b).join(',')
      : '';

    // 搜索国内商标
    {
      const params = new URLSearchParams();
      params.set('keyword', keyword);
      params.set('searchField', 'name');
      params.set('pageSize', '50');
      if (categoriesParam) params.set('categories', categoriesParam);

      const res = await fetch(`/api/trademarks?${params}`);
      const json = await res.json();
      allResults.push(...(json.data || []));
      totalCount += json.total || 0;
    }

    // 搜索国际商标
    {
      const params = new URLSearchParams();
      params.set('keyword', keyword);
      params.set('searchField', 'name');
      params.set('pageSize', '50');

      const res = await fetch(`/api/international?${params}`);
      const json = await res.json();
      allResults.push(...(json.data || []));
      totalCount += json.total || 0;
    }

    setResults(allResults);
    setTotal(totalCount);
    setLoading(false);
  };

  const toggleCategory = (cat: number) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const categoryDisplayText = selectedCategories.length === 45
    ? '全部类别'
    : selectedCategories.length === 0
      ? '请选择类别'
      : selectedCategories.sort((a, b) => a - b).join(',');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="w-12" />
          <h1 className="font-bold text-lg">商标搜索</h1>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: '商标搜索', url: window.location.href });
              }
            }}
            className="flex items-center gap-1 text-green-600 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
            分享
          </button>
        </div>
      </header>

      <div className="bg-white">
        {/* 商标类型 */}
        <div className="flex items-center px-4 py-4 border-b border-gray-100">
          <span className="w-24 text-sm font-bold text-gray-900 flex-shrink-0">商标类型</span>
          <span className="text-sm text-gray-700 ml-4">全部</span>
        </div>

        {/* 搜索类型 */}
        <div className="flex items-center px-4 py-4 border-b border-gray-100">
          <span className="w-24 text-sm font-bold text-gray-900 flex-shrink-0">搜索类型</span>
          <span className="text-sm text-gray-700 ml-4">商标名称</span>
        </div>

        {/* 商标类别 */}
        <div
          onClick={() => setShowCategoryPicker(true)}
          className="flex items-center px-4 py-4 border-b border-gray-100 cursor-pointer"
        >
          <span className="w-24 text-sm font-bold text-gray-900 flex-shrink-0">商标类别</span>
          <span className="flex-1 text-sm text-gray-700 truncate ml-4">{categoryDisplayText}</span>
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>

        {/* 关键词 */}
        <div className="flex items-center px-4 py-4 border-b border-gray-100">
          <span className="w-24 text-sm font-bold text-gray-900 flex-shrink-0">关键词</span>
          <input
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="请输入关键词"
            className="flex-1 text-sm text-gray-700 placeholder-blue-300 outline-none bg-transparent ml-4"
          />
        </div>

        {/* 搜索按钮 */}
        <div className="px-4 py-4">
          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium text-base active:bg-blue-600 disabled:opacity-70"
          >
            {loading ? '搜索中...' : '开始搜索'}
          </button>
        </div>
      </div>

      {/* 搜索结果 */}
      {(
        <div className="p-3">
          {total > 0 && (
            <p className="text-sm text-gray-500 mb-2">找到 {total} 条记录</p>
          )}
          {results.length > 0 ? (
            results.map(item => (
              <TrademarkCard key={item.id} item={item} isIntl={'country' in item} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <svg className="w-32 h-32 mb-4" viewBox="0 0 200 200" fill="none">
                <rect x="60" y="40" width="80" height="100" rx="4" stroke="currentColor" strokeWidth="2" />
                <line x1="75" y1="70" x2="125" y2="70" stroke="currentColor" strokeWidth="2" />
                <line x1="75" y1="85" x2="125" y2="85" stroke="currentColor" strokeWidth="2" />
                <line x1="75" y1="100" x2="110" y2="100" stroke="currentColor" strokeWidth="2" />
                <path d="M45 130 L55 120 M155 130 L145 120" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M50 55 L60 45 M150 55 L140 45" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M85 145 L85 160 M115 145 L115 160" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M75 160 L125 160" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p className="text-gray-500">未找到相关商标信息</p>
            </div>
          )}
        </div>
      )}

      {/* 类别选择弹窗 */}
      {showCategoryPicker && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCategoryPicker(false)} />
          <div className="relative bg-white rounded-t-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="text-base font-bold">商标类别列表</h2>
              <button onClick={() => setShowCategoryPicker(false)} className="text-gray-400 p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex gap-3 px-4 py-3">
              <button
                onClick={() => setSelectedCategories([...ALL_CATEGORIES])}
                className="px-4 py-1.5 text-sm font-medium bg-blue-500 text-white rounded-md"
              >
                全选
              </button>
              <button
                onClick={() => setSelectedCategories([])}
                className="px-4 py-1.5 text-sm font-medium bg-blue-500 text-white rounded-md"
              >
                重置
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-8">
              <div className="grid grid-cols-3 gap-x-2 gap-y-1">
                {ALL_CATEGORIES.map(cat => {
                  const selected = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className="flex items-center gap-2 py-2.5 text-left"
                    >
                      <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${
                        selected ? 'bg-blue-500' : 'border-2 border-gray-300'
                      }`}>
                        {selected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm text-gray-800">{cat}类 {CATEGORY_NAMES[cat] || ''}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
