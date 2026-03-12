import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

function addYears(dateStr: string, years: number): string {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split('T')[0];
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { type, records, images } = body;
  // type: 'domestic' | 'international'
  // records: parsed rows from Excel
  // images: { [rowIndex]: base64 string } - images keyed by row

  if (type === 'domestic') {
    const rows = records.map((r: Record<string, unknown>, idx: number) => ({
      name: r['商标名'] || '',
      category: parseInt(String(r['类别'] || '0')),
      price: parseFloat(String(r['价格(元)'] || '0')),
      products_services: r['产品/服务'] || '',
      groups: r['群组'] || '',
      registration_date: r['注册日期'] || null,
      valid_from: r['注册日期'] || null,
      valid_to: r['注册日期'] ? addYears(String(r['注册日期']), 10) : null,
      application_count: parseInt(String(r['申请量'] || '0')),
      trademark_no: String(r['商标编号'] || ''),
      ai_description: r['AI释义'] || '',
      remark: r['备注'] || '',
      image_url: images?.[idx] || null,
    }));

    // Batch insert in chunks of 100
    const chunkSize = 100;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase.from('trademarks').insert(chunk);
      if (error) {
        return NextResponse.json(
          { error: error.message, inserted },
          { status: 500 }
        );
      }
      inserted += chunk.length;
    }

    return NextResponse.json({ success: true, inserted });
  }

  if (type === 'international') {
    const rows = records.map((r: Record<string, unknown>, idx: number) => ({
      country: r['国家/地区'] || '',
      name: r['商标名'] || '',
      description: r['释义'] || '',
      trademark_no: String(r['商标号'] || ''),
      category: parseInt(String(r['类别'] || '0')),
      price: parseFloat(String(r['价格(元)'] || '0')),
      registration_date: r['注册日期'] || null,
      valid_from: r['注册日期'] || null,
      valid_to: r['注册日期'] ? addYears(String(r['注册日期']), 10) : null,
      cn_items: r['中文小项'] || '',
      local_items: r['当地小项'] || null,
      en_items: r['英文小项'] || null,
      image_url: images?.[idx] || null,
    }));

    const chunkSize = 100;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase.from('international_trademarks').insert(chunk);
      if (error) {
        return NextResponse.json(
          { error: error.message, inserted },
          { status: 500 }
        );
      }
      inserted += chunk.length;
    }

    return NextResponse.json({ success: true, inserted });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}
