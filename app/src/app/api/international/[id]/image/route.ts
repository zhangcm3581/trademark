import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { RowDataPacket } from 'mysql2';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT image_url FROM international_trademarks WHERE id = ?',
      [id]
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
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
