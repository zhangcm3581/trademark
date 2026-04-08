'use client';

import { useEffect, useState, useCallback } from 'react';
import { CATEGORY_NAMES } from '@/lib/constants';
import type { Trademark, InternationalTrademark } from '@/types';

type TabType = 'domestic' | 'international';
type ModalType = 'edit' | 'delete' | 'batchDelete' | 'batchUpdatePrice' | null;

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200, 500, 1000, 2000];

export default function AdminPage() {
  const [tab, setTab] = useState<TabType>('domestic');
  const [items, setItems] = useState<(Trademark | InternationalTrademark)[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<ModalType>(null);
  const [editItem, setEditItem] = useState<Trademark | InternationalTrademark | null>(null);
  const [deleteItem, setDeleteItem] = useState<Trademark | InternationalTrademark | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string | number>>({});
  const [batchPrice, setBatchPrice] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (search) {
      params.set('keyword', search);
      params.set('searchField', 'name');
    }
    if (categoryFilter) {
      params.set('category', categoryFilter);
    }
    if (priceMin) {
      params.set('priceMin', priceMin);
    }
    if (priceMax) {
      params.set('priceMax', priceMax);
    }

    const endpoint = tab === 'domestic' ? '/api/backstage/trademarks' : '/api/backstage/international';
    const res = await fetch(`${endpoint}?${params}`);
    const json = await res.json();
    setItems(json.data || []);
    setTotal(json.total || 0);
    setLoading(false);
  }, [tab, page, pageSize, search, categoryFilter, priceMin, priceMax]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setSelected(new Set());
  }, [tab, page]);

  // Edit modal
  const openEdit = (item: Trademark | InternationalTrademark) => {
    setEditItem(item);
    setEditForm({
      name: item.name,
      category: item.category,
      price: item.price,
      trademark_no: item.trademark_no || '',
      registration_date: item.registration_date || '',
      ...(tab === 'international' ? {
        country: (item as InternationalTrademark).country || '',
        description: (item as InternationalTrademark).description || '',
      } : {
        products_services: (item as Trademark).products_services || '',
        groups: (item as Trademark).groups || '',
      }),
    });
    setModal('edit');
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    const endpoint = tab === 'domestic'
      ? `/api/trademarks/${editItem.id}`
      : `/api/international/${editItem.id}`;

    try {
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setModal(null);
        fetchData();
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  // Delete
  const openDelete = (item: Trademark | InternationalTrademark) => {
    setDeleteItem(item);
    setModal('delete');
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setSaving(true);
    const endpoint = tab === 'domestic'
      ? `/api/trademarks/${deleteItem.id}`
      : `/api/international/${deleteItem.id}`;

    try {
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (res.ok) {
        setModal(null);
        fetchData();
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  // Batch delete
  const handleBatchDelete = async () => {
    setSaving(true);
    const ids = Array.from(selected);
    const idSet = new Set(ids);
    const endpoint = tab === 'domestic'
      ? '/api/trademarks/batch-delete'
      : '/api/international/batch-delete';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        // 乐观更新：立即从当前列表移除已删除项
        setItems(prev => prev.filter(it => !idSet.has(it.id)));
        setTotal(prev => Math.max(0, prev - ids.length));
      }
    } catch { /* ignore */ }
    setSelected(new Set());
    setModal(null);
    setSaving(false);
    // 后台静默同步（若当前页空了则会回到合理状态）
    fetchData();
  };

  // Batch update price
  const openBatchUpdatePrice = () => {
    setBatchPrice('');
    setModal('batchUpdatePrice');
  };

  const handleBatchUpdatePrice = async () => {
    const priceNum = Number(batchPrice);
    if (batchPrice === '' || !Number.isFinite(priceNum) || priceNum < 0) return;
    setSaving(true);
    const ids = Array.from(selected);
    const idSet = new Set(ids);
    const endpoint = tab === 'domestic'
      ? '/api/trademarks/batch-update-price'
      : '/api/international/batch-update-price';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, price: priceNum }),
      });
      if (res.ok) {
        // 乐观更新：立即更新当前列表价格
        setItems(prev => prev.map(it => idSet.has(it.id) ? { ...it, price: priceNum } : it));
      }
    } catch { /* ignore */ }
    setSelected(new Set());
    setModal(null);
    setSaving(false);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map(i => i.id)));
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex flex-col h-[calc(100vh-40px)]">
      {/* Sticky Header */}
      <div className="flex-shrink-0 flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-gray-200 rounded-lg p-0.5">
            <button
              onClick={() => { setTab('domestic'); setPage(1); setSearch(''); setCategoryFilter(''); setPriceMin(''); setPriceMax(''); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                tab === 'domestic' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              国内商标
            </button>
            <button
              onClick={() => { setTab('international'); setPage(1); setSearch(''); setCategoryFilter(''); setPriceMin(''); setPriceMax(''); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                tab === 'international' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              国际商标
            </button>
          </div>
          <div className="relative">
            <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="搜索商标名..."
              className="border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 w-44 bg-white"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white text-gray-600 cursor-pointer"
          >
            <option value="">全部类别</option>
            {Object.entries(CATEGORY_NAMES).map(([num, name]) => (
              <option key={num} value={num}>{num}类 {name}</option>
            ))}
          </select>
          <div className="flex items-center gap-1 border border-gray-200 rounded-lg bg-white pl-2.5 pr-2.5 py-0.5">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4" />
            </svg>
            <input
              type="number"
              min="0"
              value={priceMin}
              onChange={e => { setPriceMin(e.target.value); setPage(1); }}
              placeholder="最低价"
              className="w-16 text-xs outline-none text-gray-700 placeholder:text-gray-400"
            />
            <span className="text-gray-300 text-xs">—</span>
            <input
              type="number"
              min="0"
              value={priceMax}
              onChange={e => { setPriceMax(e.target.value); setPage(1); }}
              placeholder="最高价"
              className="w-16 text-xs outline-none text-gray-700 placeholder:text-gray-400"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <button
                onClick={openBatchUpdatePrice}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4" />
                </svg>
                修改价格 ({selected.size})
              </button>
              <button
                onClick={() => setModal('batchDelete')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                删除选中 ({selected.size})
              </button>
            </>
          )}
          <span className="text-xs text-gray-400">共 {total} 条</span>
        </div>
      </div>

      {/* Table with scrollable body */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="w-10 px-3 py-2.5 bg-gray-50">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selected.size === items.length}
                    onChange={toggleAll}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-500 focus:ring-blue-400 focus:ring-offset-0"
                  />
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">图样</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">商标名</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">类别</th>
                {tab === 'international' && (
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">国家</th>
                )}
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">注册号</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">价格</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">注册日期</th>
                <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={tab === 'international' ? 9 : 8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-400 border-t-transparent" />
                      <span className="text-xs text-gray-400">加载中...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={tab === 'international' ? 9 : 8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-1">
                      <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                      </svg>
                      <span className="text-xs text-gray-400">暂无数据</span>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`border-b border-gray-100 hover:bg-blue-50/40 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    } ${selected.has(item.id) ? '!bg-blue-50/60' : ''}`}
                  >
                    <td className="w-10 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-blue-500 focus:ring-blue-400 focus:ring-offset-0"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <img
                        src={`/api/${tab === 'international' ? 'international' : 'trademarks'}/${item.id}/image`}
                        alt=""
                        decoding="async"
                        className="w-9 h-9 object-contain rounded border border-gray-200 bg-white"
                        onError={(e) => {
                          const el = e.currentTarget;
                          el.style.display = 'none';
                          if (el.nextElementSibling) return;
                          const div = document.createElement('div');
                          div.className = 'w-9 h-9 rounded border border-gray-200 bg-gray-50 flex items-center justify-center';
                          div.innerHTML = '<svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5" /></svg>';
                          el.parentElement!.appendChild(div);
                        }}
                      />
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-800">{item.name}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-medium">
                        {item.category}类 {CATEGORY_NAMES[item.category] || ''}
                      </span>
                    </td>
                    {tab === 'international' && (
                      <td className="px-3 py-2 text-gray-600">{(item as InternationalTrademark).country}</td>
                    )}
                    <td className="px-3 py-2 text-gray-400 font-mono text-[11px]">{item.trademark_no}</td>
                    <td className="px-3 py-2">
                      <span className={`font-medium ${
                        item.price >= 5000 ? 'text-amber-600' : 'text-green-600'
                      }`}>
                        ¥{item.price.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-400 text-[11px]">{item.registration_date}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                          </svg>
                          编辑
                        </button>
                        <button
                          onClick={() => openDelete(item)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination - inside the card, at bottom */}
        <div className="flex-shrink-0 border-t border-gray-200 px-4 py-2.5 flex items-center justify-center gap-4 bg-white">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span>每页</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-gray-200 rounded px-1.5 py-0.5 text-[11px] text-gray-600 outline-none focus:border-blue-400 bg-white"
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span>条</span>
          </div>

          <span className="text-[11px] text-gray-400">
            第 {total > 0 ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, total)} 条，共 {total} 条
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2 py-1 text-[11px] border border-gray-200 rounded hover:bg-gray-50 disabled:text-gray-300 disabled:hover:bg-white transition-colors"
              >
                首页
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2 py-1 text-[11px] border border-gray-200 rounded hover:bg-gray-50 disabled:text-gray-300 disabled:hover:bg-white transition-colors"
              >
                上一页
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-7 h-7 text-[11px] rounded transition-colors ${
                      page === pageNum
                        ? 'bg-blue-500 text-white border border-blue-500'
                        : 'border border-gray-200 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2 py-1 text-[11px] border border-gray-200 rounded hover:bg-gray-50 disabled:text-gray-300 disabled:hover:bg-white transition-colors"
              >
                下一页
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-2 py-1 text-[11px] border border-gray-200 rounded hover:bg-gray-50 disabled:text-gray-300 disabled:hover:bg-white transition-colors"
              >
                末页
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {modal === 'edit' && editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-[480px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">编辑商标</h3>
              <button onClick={() => setModal(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">商标名</label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">类别</label>
                  <input
                    type="number"
                    value={editForm.category || ''}
                    onChange={e => setEditForm(f => ({ ...f, category: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">价格 (元)</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.price ?? ''}
                    onChange={e => {
                      const v = e.target.value;
                      if (v === '') {
                        setEditForm(f => ({ ...f, price: 0 }));
                      } else {
                        const n = parseInt(v);
                        if (!isNaN(n) && n >= 0) {
                          setEditForm(f => ({ ...f, price: n }));
                        }
                      }
                    }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">注册号</label>
                  <input
                    type="text"
                    value={editForm.trademark_no || ''}
                    onChange={e => setEditForm(f => ({ ...f, trademark_no: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">注册日期</label>
                  <input
                    type="text"
                    value={editForm.registration_date || ''}
                    onChange={e => setEditForm(f => ({ ...f, registration_date: e.target.value }))}
                    placeholder="YYYY-MM-DD"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  />
                </div>
              </div>
              {tab === 'international' ? (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">国家/地区</label>
                    <input
                      type="text"
                      value={editForm.country || ''}
                      onChange={e => setEditForm(f => ({ ...f, country: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">释义</label>
                    <textarea
                      value={editForm.description || ''}
                      onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                      rows={2}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 resize-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">产品/服务</label>
                    <textarea
                      value={editForm.products_services || ''}
                      onChange={e => setEditForm(f => ({ ...f, products_services: e.target.value }))}
                      rows={2}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">群组</label>
                    <input
                      type="text"
                      value={editForm.groups || ''}
                      onChange={e => setEditForm(f => ({ ...f, groups: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
              <button
                onClick={() => setModal(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 transition-colors"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {modal === 'delete' && deleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-[380px]" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-5 text-center">
              <div className="mx-auto w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-800 mb-1">确认删除</h3>
              <p className="text-xs text-gray-500">
                确定要删除商标「<span className="font-medium text-gray-700">{deleteItem.name}</span>」吗？此操作不可撤销。
              </p>
            </div>
            <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
              <button
                onClick={() => setModal(null)}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:bg-gray-300 transition-colors"
              >
                {saving ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      {modal === 'batchDelete' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-[380px]" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-5 text-center">
              <div className="mx-auto w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-800 mb-1">批量删除</h3>
              <p className="text-xs text-gray-500">
                确定要删除选中的 <span className="font-medium text-red-600">{selected.size}</span> 条商标吗？此操作不可撤销。
              </p>
            </div>
            <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
              <button
                onClick={() => setModal(null)}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={saving}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:bg-gray-300 transition-colors"
              >
                {saving ? '删除中...' : `确认删除 ${selected.size} 条`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Update Price Modal */}
      {modal === 'batchUpdatePrice' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-[380px]" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-0.5">批量修改价格</h3>
                  <p className="text-xs text-gray-500">
                    将选中的 <span className="font-medium text-amber-600">{selected.size}</span> 条商标统一设为新价格
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">新价格 (元)</label>
                <input
                  type="number"
                  min="0"
                  value={batchPrice}
                  onChange={e => setBatchPrice(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && batchPrice !== '') handleBatchUpdatePrice(); }}
                  placeholder="请输入新价格"
                  autoFocus
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
              <button
                onClick={() => setModal(null)}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleBatchUpdatePrice}
                disabled={saving || batchPrice === '' || Number(batchPrice) < 0 || !Number.isFinite(Number(batchPrice))}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:bg-gray-300 transition-colors"
              >
                {saving ? '保存中...' : `确认修改 ${selected.size} 条`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
