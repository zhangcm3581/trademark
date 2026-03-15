import { getAuthUser } from '@/lib/auth';
import { getAllSettings, invalidateSettingsCache } from '@/lib/settings';
import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function GET() {
  const settings = await getAllSettings();
  const res = NextResponse.json(settings);
  res.headers.set('Cache-Control', 'private, no-cache');
  return res;
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  for (const [key, value] of Object.entries(body)) {
    try {
      await pool.query(
        'INSERT INTO settings (`key`, `value`, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), updated_at = NOW()',
        [key, String(value)]
      );
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }
  }

  invalidateSettingsCache();
  revalidatePath('/', 'layout');

  return NextResponse.json({ success: true });
}
