import pool from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { resolveRequestTenant } from '@/lib/tenant';
import { NextRequest, NextResponse } from 'next/server';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  // 后台接口要求登录
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenant = await resolveRequestTenant(request);
  const { searchParams } = new URL(request.url);

  const keyword = searchParams.get('keyword');
  const searchField = searchParams.get('searchField');
  const category = searchParams.get('category');
  const priceMin = searchParams.get('priceMin');
  const priceMax = searchParams.get('priceMax');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  const conditions: string[] = ['tenant = ?'];
  const params: (string | number)[] = [tenant];

  if (keyword && searchField === 'trademark_no') {
    conditions.push('trademark_no LIKE ?');
    params.push(`%${keyword}%`);
  } else if (keyword) {
    conditions.push('name LIKE ?');
    params.push(`%${keyword}%`);
  }

  if (category) {
    conditions.push('category = ?');
    params.push(parseInt(category));
  }

  if (priceMin && !isNaN(Number(priceMin))) {
    conditions.push('price >= ?');
    params.push(Number(priceMin));
  }

  if (priceMax && !isNaN(Number(priceMax))) {
    conditions.push('price <= ?');
    params.push(Number(priceMax));
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const offset = (page - 1) * pageSize;

  try {
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM trademarks ${where}`,
      params
    );
    const total = countRows[0].total;

    const [data] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, category, price, \`groups\`, registration_date, valid_from, valid_to, trademark_no, remark, created_at FROM trademarks ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return NextResponse.json({ data, total, page, pageSize });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
