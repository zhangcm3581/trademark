import pool from '@/lib/db';
import { resolveRequestTenant } from '@/lib/tenant';
import { NextRequest, NextResponse } from 'next/server';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  const tenant = await resolveRequestTenant(request);

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT country, COUNT(*) as count FROM international_trademarks WHERE tenant = ? GROUP BY country ORDER BY count DESC',
      [tenant]
    );
    const res = NextResponse.json(rows);
    res.headers.set('Cache-Control', 'private, no-cache');
    return res;
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
