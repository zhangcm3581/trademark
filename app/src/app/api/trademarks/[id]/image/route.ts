import pool from '@/lib/db';
import { resolveRequestTenant } from '@/lib/tenant';
import { NextRequest, NextResponse } from 'next/server';
import { RowDataPacket } from 'mysql2';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tenant = await resolveRequestTenant(request);

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT image_url FROM trademarks WHERE id = ? AND tenant = ?',
      [id, tenant]
    );

    if (rows.length === 0 || !rows[0].image_url) {
      return new NextResponse(null, { status: 404 });
    }

    const dataUrl: string = rows[0].image_url;
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);

    if (!match) {
      return new NextResponse(null, { status: 404 });
    }

    const contentType = match[1];
    const buffer = Buffer.from(match[2], 'base64');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        // private 避免 CDN 跨租户共享；浏览器仍可缓存（id 是全局唯一 UUID，不会串）
        'Cache-Control': 'private, max-age=86400, immutable',
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
