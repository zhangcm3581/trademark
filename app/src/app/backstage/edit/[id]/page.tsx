'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

function EditContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const type = searchParams.get('type') || 'domestic';
  const isIntl = type === 'international';

  const [form, setForm] = useState<Record<string, string | number | null>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const endpoint = isIntl ? `/api/international/${id}` : `/api/trademarks/${id}`;
    fetch(endpoint)
      .then(res => res.json())
      .then(data => {
        setForm(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, isIntl]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    const endpoint = isIntl ? `/api/international/${id}` : `/api/trademarks/${id}`;
    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (res.ok) {
      router.push('/backstage');
    } else {
      setError(json.error || '保存失败');
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

  const domesticFields = [
    { key: 'name', label: '商标名' },
    { key: 'category', label: '类别', type: 'number' },
    { key: 'price', label: '价格(元)', type: 'number' },
    { key: 'trademark_no', label: '商标编号' },
    { key: 'registration_date', label: '注册日期' },
    { key: 'products_services', label: '产品/服务', multiline: true },
    { key: 'groups', label: '群组' },
    { key: 'ai_description', label: 'AI释义', multiline: true },
    { key: 'remark', label: '备注' },
    { key: 'image_url', label: '图片URL' },
  ];

  const intlFields = [
    { key: 'name', label: '商标名' },
    { key: 'country', label: '国家/地区' },
    { key: 'category', label: '类别', type: 'number' },
    { key: 'price', label: '价格(元)', type: 'number' },
    { key: 'trademark_no', label: '商标号' },
    { key: 'registration_date', label: '注册日期' },
    { key: 'description', label: '释义' },
    { key: 'cn_items', label: '中文小项', multiline: true },
    { key: 'local_items', label: '当地小项', multiline: true },
    { key: 'en_items', label: '英文小项', multiline: true },
    { key: 'image_url', label: '图片URL' },
  ];

  const fields = isIntl ? intlFields : domesticFields;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
          &larr; 返回
        </button>
        <h2 className="text-lg font-bold">编辑商标</h2>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        {fields.map(field => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
            {field.multiline ? (
              <textarea
                value={String(form[field.key] ?? '')}
                onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            ) : (
              <input
                type={field.type || 'text'}
                value={String(form[field.key] ?? '')}
                onChange={e => setForm({
                  ...form,
                  [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value
                })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            )}
          </div>
        ))}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:bg-gray-300"
          >
            {saving ? '保存中...' : '保存'}
          </button>
          <button
            onClick={() => router.back()}
            className="border border-gray-300 text-gray-600 px-6 py-2 rounded-lg text-sm font-medium"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EditPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    }>
      <EditContent />
    </Suspense>
  );
}
