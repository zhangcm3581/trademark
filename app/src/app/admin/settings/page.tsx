'use client';

import { useEffect, useState } from 'react';
import { CATEGORY_NAMES, getCategoryIcon } from '@/lib/constants';

export default function SettingsPage() {
  const [threshold, setThreshold] = useState('5000');
  const [showDiscountTab, setShowDiscountTab] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTab, setSavingTab] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.discount_price_threshold) {
          setThreshold(data.discount_price_threshold);
        }
        if (data.show_discount_tab !== undefined) {
          setShowDiscountTab(data.show_discount_tab === 'true');
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discount_price_threshold: threshold }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: '保存成功' });
      } else {
        const json = await res.json();
        setMessage({ type: 'error', text: json.error || '保存失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '保存失败' });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  const handleToggleDiscountTab = async () => {
    setSavingTab(true);
    const newValue = !showDiscountTab;
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ show_discount_tab: String(newValue) }),
      });
      if (res.ok) {
        setShowDiscountTab(newValue);
      }
    } catch {
      // ignore
    }
    setSavingTab(false);
  };

  return (
    <div className="space-y-6">
      {/* Discount tab toggle */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-bold mb-4">菜单显示设置</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">显示「特惠商标」菜单</p>
            <p className="text-xs text-gray-400 mt-1">关闭后，底部导航栏将隐藏「特惠商标」入口</p>
          </div>
          <button
            onClick={handleToggleDiscountTab}
            disabled={savingTab}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              showDiscountTab ? 'bg-blue-500' : 'bg-gray-300'
            } ${savingTab ? 'opacity-50' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                showDiscountTab ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Price threshold */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-bold mb-4">价格分类设置</h3>
        <p className="text-sm text-gray-500 mb-4">
          设定精品/特惠商标的价格阈值。价格 &gt;= 阈值为精品商标，&lt; 阈值为特惠商标。
        </p>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 w-32">特惠价格阈值</label>
          <div className="relative">
            <input
              type="number"
              value={threshold}
              onChange={e => setThreshold(e.target.value)}
              min={0}
              step={100}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-40 outline-none focus:border-blue-500 pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">元</span>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 disabled:bg-gray-300"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
        {message && (
          <p className={`mt-3 text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {message.text}
          </p>
        )}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
          <p>当前规则：</p>
          <p>- 价格 &gt;= {threshold} 元 → 精品商标</p>
          <p>- 价格 &lt; {threshold} 元 → 特惠商标</p>
        </div>
      </div>

      {/* Category reference */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-bold mb-4">商标类别参考（1-45 类）</h3>
        <p className="text-sm text-gray-500 mb-4">
          尼斯分类标准，共 45 个大类。此列表仅供参考，不可编辑。
        </p>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 45 }, (_, i) => i + 1).map(cat => (
            <div
              key={cat}
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded text-sm"
            >
              <img src={getCategoryIcon(cat)} alt="" className="w-6 h-6 object-contain" />
              <span className="text-gray-500 font-mono text-xs w-6">{cat}</span>
              <span className="text-gray-700">{CATEGORY_NAMES[cat]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
