import pool from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { RowDataPacket } from 'mysql2';

function addYears(dateStr: string, years: number): string {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split('T')[0];
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { type, records, images } = body;

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

    // Filter out duplicates by name
    const names = rows.map((r: { name: string }) => r.name).filter(Boolean);
    let existingNames = new Set<string>();
    if (names.length > 0) {
      const [existing] = await pool.query<RowDataPacket[]>(
        `SELECT name FROM trademarks WHERE name IN (${names.map(() => '?').join(',')})`,
        names
      );
      existingNames = new Set(existing.map((e: RowDataPacket) => e.name as string));
    }
    const uniqueRows = rows.filter((r: { name: string }) => r.name && !existingNames.has(r.name));
    const skipped = rows.length - uniqueRows.length;

    // Batch insert
    let inserted = 0;
    for (const row of uniqueRows) {
      try {
        await pool.query(
          'INSERT INTO trademarks (name, category, price, products_services, `groups`, registration_date, valid_from, valid_to, application_count, trademark_no, ai_description, remark, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [row.name, row.category, row.price, row.products_services, row.groups, row.registration_date, row.valid_from, row.valid_to, row.application_count, row.trademark_no, row.ai_description, row.remark, row.image_url]
        );
        inserted++;
      } catch (err) {
        return NextResponse.json({ error: String(err), inserted }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, inserted, skipped });
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

    // Filter out duplicates by name
    const intlNames = rows.map((r: { name: string }) => r.name).filter(Boolean);
    let existingIntlNames = new Set<string>();
    if (intlNames.length > 0) {
      const [existingIntl] = await pool.query<RowDataPacket[]>(
        `SELECT name FROM international_trademarks WHERE name IN (${intlNames.map(() => '?').join(',')})`,
        intlNames
      );
      existingIntlNames = new Set(existingIntl.map((e: RowDataPacket) => e.name as string));
    }
    const uniqueIntlRows = rows.filter((r: { name: string }) => r.name && !existingIntlNames.has(r.name));
    const intlSkipped = rows.length - uniqueIntlRows.length;

    let inserted = 0;
    for (const row of uniqueIntlRows) {
      try {
        await pool.query(
          'INSERT INTO international_trademarks (country, name, description, trademark_no, category, price, registration_date, valid_from, valid_to, cn_items, local_items, en_items, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [row.country, row.name, row.description, row.trademark_no, row.category, row.price, row.registration_date, row.valid_from, row.valid_to, row.cn_items, row.local_items, row.en_items, row.image_url]
        );
        inserted++;
      } catch (err) {
        return NextResponse.json({ error: String(err), inserted }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, inserted, skipped: intlSkipped });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}
