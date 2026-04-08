import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { resolveRequestTenant } from '@/lib/tenant';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenant = await resolveRequestTenant(request);

  const country = searchParams.get('country');
  const keyword = searchParams.get('keyword');
  const searchField = searchParams.get('searchField');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const ids = searchParams.get('ids');

  const conditions: string[] = ['tenant = ?'];
  const params: (string | number)[] = [tenant];

  if (ids) {
    const idList = ids.split(',');
    conditions.push(`id IN (${idList.map(() => '?').join(',')})`);
    params.push(...idList);
  }

  if (country) {
    conditions.push('country = ?');
    params.push(country);
  }

  if (keyword && searchField === 'trademark_no') {
    conditions.push('trademark_no LIKE ?');
    params.push(`%${keyword}%`);
  } else if (keyword) {
    conditions.push('name LIKE ?');
    params.push(`%${keyword}%`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const offset = (page - 1) * pageSize;

  try {
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM international_trademarks ${where}`,
      params
    );
    const total = countRows[0].total;

    const listFields = ids
      ? '*'
      : 'id, country, name, category, price, trademark_no, registration_date, valid_from, valid_to, created_at';
    const [data] = await pool.query<RowDataPacket[]>(
      `SELECT ${listFields} FROM international_trademarks ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return NextResponse.json({ data, total, page, pageSize });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
