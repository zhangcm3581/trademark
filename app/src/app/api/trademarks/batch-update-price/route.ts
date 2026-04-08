import pool from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { resolveRequestTenant } from '@/lib/tenant';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { ids, price } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids is required' }, { status: 400 });
  }
  const priceNum = Number(price);
  if (!Number.isFinite(priceNum) || priceNum < 0) {
    return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 400 });
  }

  const tenant = await resolveRequestTenant(request);

  try {
    await pool.query(
      `UPDATE trademarks SET price = ? WHERE tenant = ? AND id IN (${ids.map(() => '?').join(',')})`,
      [priceNum, tenant, ...ids]
    );
    return NextResponse.json({ success: true, updated: ids.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
