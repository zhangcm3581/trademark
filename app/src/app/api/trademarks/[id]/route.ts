import pool from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { resolveRequestTenant } from '@/lib/tenant';
import { NextRequest, NextResponse } from 'next/server';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// 客户端不可写入的字段：id 是主键，tenant 由请求上下文决定
const FORBIDDEN_FIELDS = new Set(['id', 'tenant', 'created_at']);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tenant = await resolveRequestTenant(request);
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, name, category, price, products_services, `groups`, registration_date, valid_from, valid_to, application_count, trademark_no, remark, image_url, created_at FROM trademarks WHERE id = ? AND tenant = ?',
      [id, tenant]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenant = await resolveRequestTenant(request);
  const body = await request.json();
  const fields = Object.keys(body).filter(f => !FORBIDDEN_FIELDS.has(f));
  if (fields.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const setClauses = fields.map(f => `\`${f}\` = ?`).join(', ');
  const values = fields.map(f => body[f]);

  try {
    await pool.query<ResultSetHeader>(
      `UPDATE trademarks SET ${setClauses} WHERE id = ? AND tenant = ?`,
      [...values, id, tenant]
    );
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM trademarks WHERE id = ? AND tenant = ?',
      [id, tenant]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenant = await resolveRequestTenant(request);
  try {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM trademarks WHERE id = ? AND tenant = ?',
      [id, tenant]
    );
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
