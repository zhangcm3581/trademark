import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getDiscountThreshold } from '@/lib/settings';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  const threshold = await getDiscountThreshold();

  let sql = 'SELECT category, COUNT(*) as count FROM trademarks';
  const params: number[] = [];

  if (type === 'premium') {
    sql += ' WHERE price >= ?';
    params.push(threshold);
  } else if (type === 'discount') {
    sql += ' WHERE price < ?';
    params.push(threshold);
  }

  sql += ' GROUP BY category ORDER BY category';

  try {
    const [rows] = await pool.query<RowDataPacket[]>(sql, params);
    const res = NextResponse.json(rows);
    res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res;
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
