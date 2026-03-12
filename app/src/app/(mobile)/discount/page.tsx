'use client';

import CategoryList from '@/components/CategoryList';

export default function DiscountPage() {
  return (
    <div>
      <header className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-gray-100 z-10">
        <div className="flex items-center justify-end px-4 py-3 gap-2">
          <h1 className="font-bold text-lg">特惠商标</h1>
          <button
            onClick={() => {
              if (typeof navigator !== 'undefined' && navigator.share) {
                navigator.share({ title: '特惠商标', url: window.location.href });
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
      <CategoryList type="discount" />
    </div>
  );
}
