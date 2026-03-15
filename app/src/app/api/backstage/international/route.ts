import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const keyword = searchParams.get('keyword');
  const searchField = searchParams.get('searchField');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  const conditions: string[] = [];
  const params: (string | number)[] = [];

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
      `SELECT COUNT(*) as total FROM international_trademarks ${where}`,
      params
    );
    const total = countRows[0].total;

    const [data] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM international_trademarks ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return NextResponse.json({ data, total, page, pageSize });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
