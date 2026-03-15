import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getDiscountThreshold } from '@/lib/settings';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const category = searchParams.get('category');
  const categories = searchParams.get('categories');
  const type = searchParams.get('type');
  const keyword = searchParams.get('keyword');
  const searchField = searchParams.get('searchField');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const ids = searchParams.get('ids');

  const threshold = await getDiscountThreshold();

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (ids) {
    const idList = ids.split(',');
    conditions.push(`id IN (${idList.map(() => '?').join(',')})`);
    params.push(...idList);
  }

  if (category) {
    conditions.push('category = ?');
    params.push(parseInt(category));
  } else if (categories) {
    const catList = categories.split(',').map(Number);
    conditions.push(`category IN (${catList.map(() => '?').join(',')})`);
    params.push(...catList);
  }

  if (type === 'premium') {
    conditions.push('price >= ?');
    params.push(threshold);
  } else if (type === 'discount') {
    conditions.push('price < ?');
    params.push(threshold);
  }

  if (keyword && searchField === 'trademark_no') {
    conditions.push('trademark_no LIKE ?');
    params.push(`%${keyword}%`);
  } else if (keyword) {
    conditions.push('name LIKE ?');
    params.push(`%${keyword}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;

  try {
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM trademarks ${where}`,
      params
    );
    const total = countRows[0].total;

    const listFields = ids
      ? '*'
      : 'id, name, category, price, \`groups\`, registration_date, valid_from, valid_to, trademark_no, remark, created_at';
    const [data] = await pool.query<RowDataPacket[]>(
      `SELECT ${listFields} FROM trademarks ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return NextResponse.json({ data, total, page, pageSize });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
