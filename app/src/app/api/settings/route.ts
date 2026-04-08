import { getAuthUser } from '@/lib/auth';
import { getAllSettings, invalidateSettingsCache } from '@/lib/settings';
import { resolveRequestTenant } from '@/lib/tenant';
import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

/**
 * GET /api/settings
 *   - 公开前台：根据 Host 自动取当前租户的设置
 *   - 后台：可通过 ?tenant=vip|app 显式指定（用于租户切换器）
 */
export async function GET(request: NextRequest) {
  const tenant = await resolveRequestTenant(request);
  const settings = await getAllSettings(tenant);
  const res = NextResponse.json(settings);
  res.headers.set('Cache-Control', 'private, no-cache');
  return res;
}

/**
 * PUT /api/settings
 *   仅登录用户可写。后台通过 ?tenant= 指定要修改哪个租户的设置。
 *   未指定时回退到当前请求的 host 所对应的租户。
 */
export async function PUT(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenant = await resolveRequestTenant(request);
  const body = await request.json();

  for (const [key, value] of Object.entries(body)) {
    try {
      await pool.query(
        'INSERT INTO settings (tenant, `key`, `value`, updated_at) VALUES (?, ?, ?, NOW()) ' +
        'ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), updated_at = NOW()',
        [tenant, key, String(value)]
      );
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }
  }

  invalidateSettingsCache(tenant);
  revalidatePath('/', 'layout');

  return NextResponse.json({ success: true, tenant });
}
