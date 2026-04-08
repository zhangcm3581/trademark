import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getDiscountThreshold } from '@/lib/settings';
import { resolveRequestTenant } from '@/lib/tenant';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  const tenant = await resolveRequestTenant(request);
  const threshold = await getDiscountThreshold(tenant);

  let sql = 'SELECT category, COUNT(*) as count FROM trademarks WHERE tenant = ?';
  const params: (string | number)[] = [tenant];

  if (type === 'premium') {
    sql += ' AND price >= ?';
    params.push(threshold);
  } else if (type === 'discount') {
    sql += ' AND price < ?';
    params.push(threshold);
  }

  sql += ' GROUP BY category ORDER BY category';

  try {
    const [rows] = await pool.query<RowDataPacket[]>(sql, params);
    const res = NextResponse.json(rows);
    res.headers.set('Cache-Control', 'private, no-cache');
    return res;
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
