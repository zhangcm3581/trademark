import pool from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

const CHUNK_SIZE = 500;

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids is required' }, { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      const chunk = ids.slice(i, i + CHUNK_SIZE);
      await conn.query(
        `DELETE FROM trademarks WHERE id IN (${chunk.map(() => '?').join(',')})`,
        chunk
      );
    }
    await conn.commit();
    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (err) {
    await conn.rollback();
    return NextResponse.json({ error: String(err) }, { status: 500 });
  } finally {
    conn.release();
  }
}
