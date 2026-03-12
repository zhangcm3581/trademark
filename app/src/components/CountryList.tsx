'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { COUNTRY_FLAGS } from '@/lib/constants';
import type { CountryCount } from '@/types';

export default function CountryList() {
  const [countries, setCountries] = useState<CountryCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/international/countries')
      .then(res => res.json())
      .then(data => {
        setCountries(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (countries.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        暂无数据
      </div>
    );
  }

  return (
    <div
      className="min-h-screen px-3 py-3 space-y-2"
      style={{ background: 'linear-gradient(180deg, #fce4e4 0%, #fdeaea 30%, #fff0f0 60%, #ffffff 100%)' }}
    >
      {countries.map(({ country, count }) => (
        <Link
          key={country}
          href={`/list?type=international&country=${encodeURIComponent(country)}`}
          className="flex items-center px-4 py-3 bg-white rounded-xl shadow-sm border border-gray-100 active:bg-gray-50 transition-all hover:shadow-md"
        >
          <span className="text-3xl w-12">
            {COUNTRY_FLAGS[country] || '🏳️'}
          </span>
          <span className="flex-1 text-base text-gray-900 ml-2">{country}</span>
          <span className="text-blue-500 font-bold">
            {count} <span className="text-sm font-bold">件</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
